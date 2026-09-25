/**
 * Subscription Hours Service
 * 
 * Manages hour deduction ONLY when session report is created
 * 
 * Business Rule:
 * - Hours are deducted ONLY when SessionReport is created (attendance = true OR false)
 * - Approved status alone does NOT deduct hours
 * - Canceled sessions do NOT restore hours (because they were never deducted)
 */

const mongoose = require('mongoose');
const UserSubscription = require('../models/UserSubscription');
const { BadRequestError } = require('../utils/errors');

/**
 * Deduct hours when session report is created
 * This is the ONLY point where hours are deducted
 * 
 * Applies to both:
 * - attendance = true (completed)
 * - attendance = false (no_show)
 * 
 * Uses transaction to ensure atomicity (with fallback for standalone MongoDB)
 * 
 * @param {ObjectId} subscriptionId - Subscription ID
 * @param {number} hours - Hours to deduct
 * @returns {Promise<UserSubscription>} - Updated subscription
 */
async function deductHours(subscriptionId, hours) {
  let session = null;
  
  try {
    // Try to use transaction (requires replica set)
    session = await mongoose.startSession();
    session.startTransaction();

    const subscription = await UserSubscription.findById(subscriptionId).session(session);
    
    if (!subscription) {
      await session.abortTransaction();
      throw new BadRequestError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
    }

    if (subscription.remainingHours < hours) {
      await session.abortTransaction();
      throw new BadRequestError(
        `Insufficient hours. Available: ${subscription.remainingHours}, Required: ${hours}`,
        'INSUFFICIENT_HOURS'
      );
    }

    subscription.remainingHours -= hours;
    await subscription.save({ session });

    await session.commitTransaction();
    return subscription;
  } catch (error) {
    // Fallback for standalone MongoDB without transactions
    if (
      String(error.message || '').includes('Transaction numbers are only allowed') ||
      String(error.code || '') === '20' ||
      error.name === 'DatabaseError'
    ) {
      try {
        if (session) {
          try { await session.abortTransaction(); } catch {}
          session.endSession();
        }
        
        // Non-transactional fallback
        const subscription = await UserSubscription.findById(subscriptionId);
        
        if (!subscription) {
          throw new BadRequestError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
        }

        if (subscription.remainingHours < hours) {
          throw new BadRequestError(
            `Insufficient hours. Available: ${subscription.remainingHours}, Required: ${hours}`,
            'INSUFFICIENT_HOURS'
          );
        }

        subscription.remainingHours -= hours;
        await subscription.save();
        
        return subscription;
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
    
    // If it's a different error, handle transaction cleanup
    if (session) {
      try {
        await session.abortTransaction();
      } catch {}
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

module.exports = {
  deductHours
};
