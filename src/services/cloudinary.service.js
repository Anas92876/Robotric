/**
 * Cloudinary Service
 * 
 * Handles image upload and deletion to/from Cloudinary
 */

const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Upload image to Cloudinary
 * @param {Buffer} buffer - Image buffer
 * @param {string} folder - Cloudinary folder path (e.g., 'robotric/tasks/123/submissions/456')
 * @param {string} publicId - Optional public ID (if not provided, Cloudinary generates one)
 * @returns {Promise<Object>} - Cloudinary upload result with url, public_id, etc.
 */
async function uploadImage(buffer, folder, publicId = null) {
  if (!cloudinary.config().cloud_name) {
    throw new AppError('Cloudinary is not configured', 500);
  }

  // Validate buffer
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    const error = new Error('Invalid or empty image buffer');
    logger.logError(error, { context: 'cloudinary_upload_validation', folder, bufferSize: buffer?.length });
    throw new AppError('Invalid or empty image buffer', 400);
  }

  return new Promise((resolve, reject) => {
    let timeoutId = null;
    let isResolved = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const safeReject = (error) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      logger.logError(error, { 
        context: 'cloudinary_upload_error', 
        folder, 
        publicId,
        bufferSize: buffer.length,
        errorMessage: error.message,
        errorStack: error.stack
      });
      reject(new AppError(`Failed to upload image to Cloudinary: ${error.message}`, 500));
    };

    const safeResolve = (result) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve(result);
    };

    const uploadOptions = {
      folder: folder,
      resource_type: 'image',
      quality: 'auto', // Auto-optimize quality
    };
    
    if (publicId) {
      uploadOptions.public_id = publicId;
    }
    
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          safeReject(error);
        } else {
          safeResolve(result);
        }
      }
    );
    
    // Create readable stream from buffer
    const readableStream = Readable.from(buffer);
    
    // Handle readable stream errors
    readableStream.on('error', (error) => {
      safeReject(new Error(`Readable stream error: ${error.message}`));
    });
    
    // Handle upload stream errors (pipe errors)
    stream.on('error', (error) => {
      safeReject(new Error(`Upload stream error: ${error.message}`));
    });
    
    // Handle stream close/end events
    stream.on('close', () => {
      if (!isResolved) {
        cleanup();
      }
    });
    
    // Pipe with error handling
    readableStream.pipe(stream);
    
    // Allow up to 10 minutes for slow connections
    timeoutId = setTimeout(() => {
      readableStream.destroy();
      stream.destroy();
      safeReject(new Error('Cloudinary upload timeout after 10 minutes'));
    }, 600000);
  });
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID (full path including folder)
 * @returns {Promise<Object>} - Cloudinary delete result
 */
async function deleteImage(publicId) {
  if (!cloudinary.config().cloud_name) {
    throw new AppError('Cloudinary is not configured', 500);
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image'
    });
    
    if (result.result === 'not found') {
      logger.warn(`Image not found in Cloudinary: ${publicId}`);
      return { deleted: false, result: 'not found' };
    }
    
    return result;
  } catch (error) {
    logger.logError(error, { context: 'cloudinary_delete', publicId });
    throw new AppError('Failed to delete image from Cloudinary', 500);
  }
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && urlObj.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Standardize URL by removing unnecessary query parameters
 * @param {string} url - URL to standardize
 * @returns {string} - Standardized URL
 */
function standardizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    // Remove query parameters that Cloudinary adds automatically (like version, signature)
    // Keep only essential transformation parameters in the path
    urlObj.search = '';
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Generate thumbnail URL from Cloudinary public ID
 * Ensures URL is always valid and standardized
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options (width, height, crop, etc.)
 * @returns {string|null} - Valid thumbnail URL or null if invalid
 */
function generateThumbnailUrl(publicId, options = {}) {
  // Validate input
  if (!publicId || typeof publicId !== 'string' || publicId.trim().length === 0) {
    logger.logError(new Error('Invalid publicId provided to generateThumbnailUrl'), {
      context: 'thumbnail_url_generation',
      publicId: publicId
    });
    return null;
  }

  // Check Cloudinary configuration
  if (!cloudinary.config().cloud_name) {
    logger.logError(new Error('Cloudinary not configured'), {
      context: 'thumbnail_url_generation',
      publicId: publicId
    });
    return null;
  }

  // Standard transformation options (no query params needed - transformations in path)
  const defaultOptions = {
    width: 300,
    height: 300,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto', // Use fetch_format instead of format to preserve original extension
    secure: true
    // Don't include version parameter - let Cloudinary handle it automatically
  };

  const transformOptions = { ...defaultOptions, ...options };
  
  try {
    // Generate URL using Cloudinary SDK
    let thumbnailUrl = cloudinary.url(publicId, transformOptions);
    
    // Standardize URL (remove query params)
    thumbnailUrl = standardizeUrl(thumbnailUrl);
    
    // Validate the generated URL
    if (!isValidUrl(thumbnailUrl)) {
      logger.logError(new Error('Generated thumbnail URL is invalid'), {
        context: 'thumbnail_url_validation',
        publicId: publicId,
        generatedUrl: thumbnailUrl
      });
      return null;
    }
    
    return thumbnailUrl;
  } catch (error) {
    logger.logError(error, {
      context: 'thumbnail_url_generation_error',
      publicId: publicId,
      options: transformOptions
    });
    return null;
  }
}

module.exports = {
  uploadImage,
  deleteImage,
  generateThumbnailUrl,
  isValidUrl,
  standardizeUrl
};
