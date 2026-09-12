const { ValidationError } = require('../utils/errors');

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Collect all errors, not just the first one
      stripUnknown: true // Remove unknown fields
    });
    
    if (error) {
      // Format Joi errors into our ValidationError format
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      throw new ValidationError('Validation failed', errors);
    }
    
    req.body = value;
    next();
  };
}

module.exports = { validate };







