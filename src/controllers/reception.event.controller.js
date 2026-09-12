const Event = require('../models/Event');
const Lead = require('../models/Lead');

/**
 * Get events within a date range
 * GET /api/reception/events
 * Query params: start, end
 */
exports.getEvents = async (req, res) => {
  try {
    const { start, end } = req.query;
    
    const query = {};
    
    // Filter by date range if provided
    if (start && end) {
      query.startTime = { $gte: new Date(start), $lte: new Date(end) };
    } else if (start) {
      query.startTime = { $gte: new Date(start) };
    } else if (end) {
      query.startTime = { $lte: new Date(end) };
    }

    const events = await Event.find(query)
      .populate('participants.leadId', 'fullName mobileNumber status')
      .populate('createdBy', 'name')
      .sort({ startTime: 1 });

    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      message: 'Failed to fetch events',
    });
  }
};

/**
 * Create a new event
 * POST /api/reception/events
 */
exports.createEvent = async (req, res) => {
  try {
    const { title, description, startTime, endTime, color, participants } = req.body;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: 'Title, start time, and end time are required' });
    }

    const event = await Event.create({
      title,
      description,
      startTime,
      endTime,
      color,
      participants: participants || [],
      createdBy: req.user.id
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('participants.leadId', 'fullName mobileNumber status')
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: populatedEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      message: 'Failed to create event',
    });
  }
};

/**
 * Update an event
 * PUT /api/reception/events/:id
 */
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startTime, endTime, color, participants } = req.body;

    let event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event = await Event.findByIdAndUpdate(
      id,
      {
        title,
        description,
        startTime,
        endTime,
        color,
        participants
      },
      { new: true, runValidators: true }
    )
    .populate('participants.leadId', 'fullName mobileNumber status')
    .populate('createdBy', 'name');

    res.json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      message: 'Failed to update event',
    });
  }
};

/**
 * Delete an event
 * DELETE /api/reception/events/:id
 */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await event.deleteOne();

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      message: 'Failed to delete event',
    });
  }
};
