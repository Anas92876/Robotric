/**
 * Validation schemas for Contact routes
 */

const Joi = require('joi');

const submitContactSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]{8,}$/).required(),
  email: Joi.string().email().optional().allow('', null),
  location: Joi.string().max(200).optional().allow('', null),
  who: Joi.string().optional().allow('', null),
  otherType: Joi.string().max(100).optional().allow('', null),
  subject: Joi.string().min(3).max(200).required(),
  message: Joi.string().max(5000).optional().allow('', null)
});

const updateContactSchema = Joi.object({
  status: Joi.string().valid('new', 'read', 'replied', 'archived').optional(),
  convertedToLead: Joi.string().optional().allow(null)
});

module.exports = {
  submitContactSchema,
  updateContactSchema
};
