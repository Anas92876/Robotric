/**
 * Validation schemas for Reception routes
 */

const Joi = require('joi');

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('student', 'trainer', 'teacher', 'social', 'reception', 'clo', 'admin', 'cto', 'engineer', 'client').required(),
  phone: Joi.string().optional().allow('', null)
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('student', 'trainer', 'teacher', 'social', 'reception', 'clo', 'admin', 'cto', 'engineer', 'client').optional(),
  phone: Joi.string().optional().allow('', null),
  password: Joi.string().min(6).optional()
});

module.exports = {
  createUserSchema,
  updateUserSchema
};
