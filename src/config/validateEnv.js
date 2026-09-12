/**
 * Environment Variable Validation Module
 *
 * This module validates that all required environment variables are present
 * and properly configured before the application starts.
 *
 * Best Practices:
 * - Fail fast: Exit immediately if critical config is missing
 * - Provide clear error messages for developers
 * - Validate format and security requirements
 * - Log successful validation for debugging
 */

const crypto = require('crypto');

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'CLIENT_ORIGIN'
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  PORT: '4889',
  NODE_ENV: 'development',
  JWT_EXPIRES_IN: '7d',
  COOKIE_DOMAIN: '',
  COOKIE_SECURE: 'false',
  COOKIE_SAMESITE: 'lax'
};

/**
 * Validates MongoDB URI format
 * @param {string} uri - MongoDB connection string
 * @returns {boolean} - True if valid
 */
function isValidMongoURI(uri) {
  if (!uri || typeof uri !== 'string') {
    return false;
  }
  try {
    return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
  } catch (error) {
    return false;
  }
}

/**
 * Validates JWT secret strength
 * @param {string} secret - JWT secret key
 * @returns {Object} - { valid: boolean, message: string }
 */
function validateJWTSecret(secret) {
  try {
    if (!secret) {
      return { valid: false, message: 'JWT_SECRET is required' };
    }

    if (typeof secret !== 'string') {
      return { valid: false, message: 'JWT_SECRET must be a string' };
    }

    if (secret.length < 32) {
      return {
        valid: false,
        message: 'JWT_SECRET must be at least 32 characters for security'
      };
    }

    // Check for common weak secrets
    const weakSecrets = [
      'secret',
      'mysecret',
      'jwt_secret',
      'change_me',
      'replace_me',
      'robotrick',
      'robotrick_is_the_best'
    ];

    if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
      return {
        valid: false,
        message: 'JWT_SECRET appears to be a weak/default value. Use a cryptographically secure random string.'
      };
    }

    return { valid: true, message: 'JWT_SECRET is valid' };
  } catch (error) {
    return { valid: false, message: `JWT_SECRET validation error: ${error.message}` };
  }
}

/**
 * Generates a cryptographically secure JWT secret
 * @returns {string} - Random secret (64 characters)
 */
function generateSecureJWTSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates all environment variables
 * @throws {Error} - If validation fails
 */
function validateEnv() {
  try {
    console.log('🔍 Validating environment configuration...\n');

    const errors = [];
    const warnings = [];

    // Check for missing required variables
    const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

    if (missing.length > 0) {
      errors.push('Missing required environment variables:');
      missing.forEach(key => {
        errors.push(`  ❌ ${key}`);
      });
    }

    // Validate MONGO_URI format (with error handling)
    try {
      if (process.env.MONGO_URI && !isValidMongoURI(process.env.MONGO_URI)) {
        errors.push('  ❌ MONGO_URI has invalid format. Must start with mongodb:// or mongodb+srv://');
      }
    } catch (error) {
      errors.push(`  ❌ MONGO_URI validation error: ${error.message}`);
    }

    // Validate optional MONGO_URI_2 (fallback cluster) format
    try {
      if (process.env.MONGO_URI_2) {
        if (!isValidMongoURI(process.env.MONGO_URI_2)) {
          errors.push('  ❌ MONGO_URI_2 has invalid format. Must start with mongodb:// or mongodb+srv://');
        } else {
          console.log('  ℹ️  MONGO_URI_2 configured — fallback cluster is available');
        }
      } else {
        console.log('  ℹ️  MONGO_URI_2 not set — no fallback cluster configured (optional)');
      }
    } catch (error) {
      errors.push(`  ❌ MONGO_URI_2 validation error: ${error.message}`);
    }

    // Validate JWT_SECRET strength (with error handling)
    try {
      if (process.env.JWT_SECRET) {
        const jwtValidation = validateJWTSecret(process.env.JWT_SECRET);
        if (!jwtValidation.valid) {
          errors.push(`  ❌ ${jwtValidation.message}`);
          console.log('\n💡 Generate a secure secret with:');
          console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
          console.log('\n   Or use the generated one below:');
          console.log(`   JWT_SECRET=${generateSecureJWTSecret()}\n`);
        }
      }
    } catch (error) {
      errors.push(`  ❌ JWT_SECRET validation error: ${error.message}`);
    }

    // Check for development mode in production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.CLIENT_ORIGIN === 'http://localhost:5173') {
        warnings.push('  ⚠️  CLIENT_ORIGIN is set to localhost in production mode');
      }
      if (process.env.COOKIE_SECURE !== 'true') {
        warnings.push('  ⚠️  COOKIE_SECURE should be "true" in production');
      }
    }

    // Set defaults for optional variables (with error handling)
    try {
      Object.entries(OPTIONAL_ENV_VARS).forEach(([key, defaultValue]) => {
        if (!process.env[key]) {
          process.env[key] = defaultValue;
          console.log(`  ℹ️  ${key} not set, using default: "${defaultValue}"`);
        }
      });
    } catch (error) {
      warnings.push(`  ⚠️  Error setting default environment variables: ${error.message}`);
    }

    // Display errors
    if (errors.length > 0) {
      console.error('\n❌ Environment Validation Failed:\n');
      errors.forEach(err => console.error(err));
      console.error('\n💡 Create a .env file in the server directory with the required variables.');
      console.error('   See .env.example for reference.');
      console.error('\n📍 Server startup aborted due to missing/invalid environment variables.\n');
      process.exit(1);
    }

    // Display warnings
    if (warnings.length > 0) {
      console.warn('\n⚠️  Environment Warnings:\n');
      warnings.forEach(warn => console.warn(warn));
      console.warn('');
    }

    // Success message (with error handling for maskMongoURI)
    try {
      console.log('\n✅ Environment validation passed');
      console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Port: ${process.env.PORT || '4889'}`);
      console.log(`   Client Origin: ${process.env.CLIENT_ORIGIN || 'Not set'}`);
      console.log(`   MongoDB Cluster 1: ${maskMongoURI(process.env.MONGO_URI)}`);
      console.log(`   MongoDB Cluster 2: ${process.env.MONGO_URI_2 ? maskMongoURI(process.env.MONGO_URI_2) : 'Not configured (optional)'}`);
      console.log('');
    } catch (error) {
      console.log('\n✅ Environment validation passed (with logging errors)');
      console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
    }
  } catch (error) {
    // If validation itself fails, log and rethrow
    console.error('❌ Fatal error during environment validation:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Masks sensitive parts of MongoDB URI for logging
 * @param {string} uri - MongoDB connection string
 * @returns {string} - Masked URI
 */
function maskMongoURI(uri) {
  if (!uri) return 'Not configured';

  try {
    // Replace password with asterisks
    return uri.replace(/:([^@:]+)@/, ':****@');
  } catch (error) {
    return 'Connected (URI format invalid for masking)';
  }
}

module.exports = {
  validateEnv,
  generateSecureJWTSecret,
  validateJWTSecret,
  isValidMongoURI
};
