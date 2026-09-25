/**
 * Seed Subscription Plans
 * 
 * Creates default subscription plans in the database
 * Run: node server/src/scripts/seedSubscriptionPlans.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionPlan = require('../models/SubscriptionPlan');

const plans = [
  {
    name: 'Basic Plan',
    monthlyHours: 10,
    price: 50,
    isActive: true,
    description: 'Perfect for beginners - 10 hours per month'
  },
  {
    name: 'Standard Plan',
    monthlyHours: 20,
    price: 90,
    isActive: true,
    description: 'Most popular - 20 hours per month'
  },
  {
    name: 'Premium Plan',
    monthlyHours: 40,
    price: 160,
    isActive: true,
    description: 'For serious learners - 40 hours per month'
  }
];

async function seedPlans() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing plans (optional - comment out to keep existing)
    // await SubscriptionPlan.deleteMany({});
    // console.log('🗑️  Cleared existing plans');

    // Insert plans
    for (const planData of plans) {
      const existingPlan = await SubscriptionPlan.findOne({ name: planData.name });
      
      if (existingPlan) {
        console.log(`⏭️  Plan "${planData.name}" already exists, skipping...`);
      } else {
        const plan = await SubscriptionPlan.create(planData);
        console.log(`✅ Created plan: ${plan.name} (${plan.monthlyHours} hours, $${plan.price})`);
      }
    }

    console.log('\n✅ Subscription plans seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
}

seedPlans();
