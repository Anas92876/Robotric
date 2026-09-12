/**
 * ObjectId Validation Middleware
 *
 * Validates MongoDB ObjectId format in route parameters
 * Prevents CastError exceptions and information disclosure
 *
 * Usage:
 *   router.get('/:id', validateObjectId('id'), getPartById);
 *   router.delete('/:partId', validateObjectId('partId'), deletePart);
 *
 * Best Practices:
 * - Apply to all routes with MongoDB ID parameters
 * - Fail fast with clear error messages
 * - Prevents database query attempts with invalid IDs
 */

const mongoose = require('mongoose');
const { BadRequestError } = require('../utils/errors');

/**
 * Creates middleware to validate ObjectId in route params
 *
 * @param {string|string[]} paramNames - Parameter name(s) to validate
 * @returns {Function} - Express middleware
 */
function validateObjectId(paramNames = 'id') {
  // Normalize to array
  const params = Array.isArray(paramNames) ? paramNames : [paramNames];

  return (req, res, next) => {
    const invalidParams = [];

    // Check each parameter
    for (const param of params) {
      const value = req.params[param];

      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        invalidParams.push(param);
      }
    }

    // If any invalid, throw error
    if (invalidParams.length > 0) {
      const paramList = invalidParams.join(', ');
      throw new BadRequestError(
        `Invalid ID format for: ${paramList}`,
        'INVALID_OBJECT_ID'
      );
    }

    next();
  };
}

/**
 * Validate multiple ObjectIds in request body
 * Useful for batch operations
 *
 * @param {string[]} fieldPaths - Dot-notation paths to ID fields
 * @returns {Function} - Express middleware
 */
function validateObjectIdsInBody(fieldPaths) {
  return (req, res, next) => {
    const invalidFields = [];

    for (const path of fieldPaths) {
      const value = getNestedValue(req.body, path);

      if (value) {
        // Handle arrays of IDs
        if (Array.isArray(value)) {
          const hasInvalid = value.some(id => !mongoose.Types.ObjectId.isValid(id));
          if (hasInvalid) {
            invalidFields.push(path);
          }
        }
        // Handle single ID
        else if (!mongoose.Types.ObjectId.isValid(value)) {
          invalidFields.push(path);
        }
      }
    }

    if (invalidFields.length > 0) {
      throw new BadRequestError(
        `Invalid ID format in fields: ${invalidFields.join(', ')}`,
        'INVALID_OBJECT_ID'
      );
    }

    next();
  };
}

/**
 * Get nested value from object using dot notation
 *
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot-notation path (e.g., 'items.0.partId')
 * @returns {*} - Value at path
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

module.exports = {
  validateObjectId,
  validateObjectIdsInBody
};
