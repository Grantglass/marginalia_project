/**
 * Application Configuration
 * Centralizes all configuration values and environment variables
 */

require('dotenv').config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  // Image processing configuration
  images: {
    standardWidth: 5457,
    standardHeight: 4699,
    directory: 'images',
  },

  // XML parsing configuration
  xml: {
    filePath: process.env.XML_FILE_PATH || 'BB749.1.ms.xml',
    cacheTTL: parseInt(process.env.CACHE_TTL || '3600000', 10), // 1 hour default
  },

  // Page-specific adjustments
  pageAdjustments: {
    'bb749.1.ms.01': {
      topAdjustment: -3, // Title page adjustment
    },
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

module.exports = config;
