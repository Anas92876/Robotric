/**
 * Reception Contact History Controller
 *
 * Handles contact history management for reception staff:
 * - Create contact history with automatic calendar event creation
 * - View contact history for leads
 * - Update contact history and associated events
 * - Delete contact history and associated events
 * - Get contact history statistics
 */

const ContactHistory = require('../models/ContactHistory');
const Event = require('../models/Event');
const Lead = require('../models/Lead');
const mongoose = require('mongoose');

/**
 * Get contact history for a specific lead
 * GET /api/reception/leads/:leadId/contact-history
 */
exports.getContactHistoryByLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { page = 1, limit = 20, sort = '-contactDate' } = req.query;

    // Validate lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const contactHistory = await ContactHistory.find({ leadId })
      .populate('createdBy', 'name email')
      .populate('scheduledEventId', 'title startTime endTime color')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ContactHistory.countDocuments({ leadId });

    res.json({
      success: true,
      count: contactHistory.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      contactHistory
    });
  } catch (error) {
    console.error('Error fetching contact history:', error);
    res.status(500).json({
      message: 'Failed to fetch contact history',
    });
  }
};

/**
 * Create new contact history with automatic calendar event
 * POST /api/reception/leads/:leadId/contact-history
 */
exports.createContactHistory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { leadId } = req.params;
    const {
      contactType,
      callReason,
      outcome,
      notes,
      contactDate,
      duration,
      nextFollowUpDate,
      eventTitle,
      eventColor
    } = req.body;

    // Validate required fields
    if (!contactType || !callReason || !outcome || !contactDate) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Contact type, call reason, outcome, and contact date are required'
      });
    }

    // Validate lead exists
    const lead = await Lead.findById(leadId).session(session);
    if (!lead) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Determine event color based on outcome if not provided
    const colorMap = {
      successful: 'green',
      callback_requested: 'yellow',
      no_answer: 'gray',
      not_interested: 'red',
      converted: 'blue',
      other: 'purple'
    };
    const finalEventColor = eventColor || colorMap[outcome] || 'blue';

    // Generate event title
    const finalEventTitle = eventTitle || 
      `${contactType.charAt(0).toUpperCase() + contactType.slice(1)} with ${lead.fullName} - ${callReason}`;

    // Generate event description
    const eventDescription = `
Contact Type: ${contactType}
Outcome: ${outcome.replace(/_/g, ' ')}
Reason: ${callReason}
${notes ? `\nNotes: ${notes}` : ''}
    `.trim();

    // Calculate event end time based on duration
    const eventStartTime = new Date(contactDate);
    const eventEndTime = new Date(eventStartTime);
    eventEndTime.setMinutes(eventEndTime.getMinutes() + (duration || 30));

    // Create calendar event
    const event = await Event.create([{
      title: finalEventTitle,
      description: eventDescription,
      startTime: eventStartTime,
      endTime: eventEndTime,
      color: finalEventColor,
      participants: [{
        type: 'lead',
        leadId: leadId
      }],
      createdBy: req.user.id
    }], { session });

    // Create contact history
    const contactHistory = await ContactHistory.create([{
      leadId,
      contactType,
      callReason,
      outcome,
      notes,
      contactDate: eventStartTime,
      duration: duration || 30,
      scheduledEventId: event[0]._id,
      nextFollowUpDate,
      createdBy: req.user.id
    }], { session });

    // Update lead's next follow-up date if provided
    if (nextFollowUpDate) {
      lead.nextFollowUpDate = nextFollowUpDate;
      await lead.save({ session });
    }

    // Add to lead's follow-ups array
    lead.followUps.push({
      note: `${contactType}: ${callReason} - ${outcome}`,
      date: eventStartTime,
      by: req.user.id
    });
    await lead.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate and return
    const populatedHistory = await ContactHistory.findById(contactHistory[0]._id)
      .populate('createdBy', 'name email')
      .populate('scheduledEventId', 'title startTime endTime color');

    res.status(201).json({
      success: true,
      message: 'Contact history created successfully',
      contactHistory: populatedHistory
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating contact history:', error);
    res.status(500).json({
      message: 'Failed to create contact history',
    });
  } finally {
    session.endSession();
  }
};

/**
 * Update contact history and associated event
 * PUT /api/reception/contact-history/:id
 */
exports.updateContactHistory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const {
      contactType,
      callReason,
      outcome,
      notes,
      contactDate,
      duration,
      nextFollowUpDate,
      eventTitle,
      eventColor
    } = req.body;

    // Find contact history
    const contactHistory = await ContactHistory.findById(id).session(session);
    if (!contactHistory) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Contact history not found' });
    }

    // Update contact history fields
    if (contactType) contactHistory.contactType = contactType;
    if (callReason) contactHistory.callReason = callReason;
    if (outcome) contactHistory.outcome = outcome;
    if (notes !== undefined) contactHistory.notes = notes;
    if (contactDate) contactHistory.contactDate = contactDate;
    if (duration !== undefined) contactHistory.duration = duration;
    if (nextFollowUpDate !== undefined) contactHistory.nextFollowUpDate = nextFollowUpDate;

    await contactHistory.save({ session });

    // Update associated calendar event
    const event = await Event.findById(contactHistory.scheduledEventId).session(session);
    if (event) {
      // Get lead for title generation
      const lead = await Lead.findById(contactHistory.leadId).session(session);
      
      // Determine event color
      const colorMap = {
        successful: 'green',
        callback_requested: 'yellow',
        no_answer: 'gray',
        not_interested: 'red',
        converted: 'blue',
        other: 'purple'
      };
      const finalEventColor = eventColor || colorMap[contactHistory.outcome] || event.color;

      // Update event
      event.title = eventTitle || 
        `${contactHistory.contactType.charAt(0).toUpperCase() + contactHistory.contactType.slice(1)} with ${lead.fullName} - ${contactHistory.callReason}`;
      
      event.description = `
Contact Type: ${contactHistory.contactType}
Outcome: ${contactHistory.outcome.replace(/_/g, ' ')}
Reason: ${contactHistory.callReason}
${contactHistory.notes ? `\nNotes: ${contactHistory.notes}` : ''}
      `.trim();

      event.startTime = contactHistory.contactDate;
      const eventEndTime = new Date(contactHistory.contactDate);
      eventEndTime.setMinutes(eventEndTime.getMinutes() + contactHistory.duration);
      event.endTime = eventEndTime;
      event.color = finalEventColor;

      await event.save({ session });
    }

    // Update lead's next follow-up date if provided
    if (nextFollowUpDate !== undefined) {
      await Lead.findByIdAndUpdate(
        contactHistory.leadId,
        { nextFollowUpDate },
        { session }
      );
    }

    // Commit transaction
    await session.commitTransaction();

    // Populate and return
    const populatedHistory = await ContactHistory.findById(id)
      .populate('createdBy', 'name email')
      .populate('scheduledEventId', 'title startTime endTime color');

    res.json({
      success: true,
      message: 'Contact history updated successfully',
      contactHistory: populatedHistory
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating contact history:', error);
    res.status(500).json({
      message: 'Failed to update contact history',
    });
  } finally {
    session.endSession();
  }
};

/**
 * Delete contact history and associated event
 * DELETE /api/reception/contact-history/:id
 */
exports.deleteContactHistory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // Find contact history
    const contactHistory = await ContactHistory.findById(id).session(session);
    if (!contactHistory) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Contact history not found' });
    }

    // Delete associated calendar event
    if (contactHistory.scheduledEventId) {
      await Event.findByIdAndDelete(contactHistory.scheduledEventId).session(session);
    }

    // Delete contact history
    await contactHistory.deleteOne({ session });

    // Commit transaction
    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Contact history deleted successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting contact history:', error);
    res.status(500).json({
      message: 'Failed to delete contact history',
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get contact history statistics
 * GET /api/reception/contact-history/stats
 */
exports.getContactHistoryStats = async (req, res) => {
  try {
    const { startDate, endDate, leadId } = req.query;

    const matchQuery = {};
    
    if (leadId) {
      matchQuery.leadId = mongoose.Types.ObjectId(leadId);
    }

    if (startDate || endDate) {
      matchQuery.contactDate = {};
      if (startDate) matchQuery.contactDate.$gte = new Date(startDate);
      if (endDate) matchQuery.contactDate.$lte = new Date(endDate);
    }

    // Get stats by outcome
    const outcomeStats = await ContactHistory.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$outcome',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get stats by contact type
    const typeStats = await ContactHistory.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$contactType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total count
    const total = await ContactHistory.countDocuments(matchQuery);

    // Get average duration
    const avgDuration = await ContactHistory.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        total,
        byOutcome: outcomeStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        byType: typeStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        averageDuration: avgDuration.length > 0 ? Math.round(avgDuration[0].avgDuration) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching contact history stats:', error);
    res.status(500).json({
      message: 'Failed to fetch contact history statistics',
    });
  }
};
