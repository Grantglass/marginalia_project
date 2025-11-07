/**
 * Marginalia Project Server
 * Serves William Blake manuscript annotations with improved security,
 * error handling, and performance optimizations
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config/config');
const logger = require('./utils/logger');
const xmlParser = require('./services/xmlParser');

// Initialize Express application
const app = express();

// =============================================================================
// Middleware Configuration
// =============================================================================

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  })
);

// Compression for responses
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/transcriptions', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use(express.static(__dirname));
app.use('/images', express.static(path.join(__dirname, config.images.directory)));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// =============================================================================
// Routes
// =============================================================================

/**
 * Health check endpoint
 * Returns server status and cache information
 */
app.get('/health', async (req, res) => {
  try {
    const cacheStatus = xmlParser.getCacheStatus();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.env,
      cache: cacheStatus,
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service temporarily unavailable',
    });
  }
});

/**
 * Main page route
 * Serves the HTML interface
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Transcriptions API endpoint
 * Returns all transcription data as JSON
 */
app.get('/transcriptions', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const transcriptions = await xmlParser.getTranscriptions(
      config.xml.filePath,
      forceRefresh
    );

    res.json(transcriptions);
  } catch (error) {
    logger.error('Error fetching transcriptions:', error);
    res.status(500).json({
      error: 'Failed to fetch transcriptions',
      message: config.server.isProduction ? 'Internal server error' : error.message,
    });
  }
});

/**
 * Cache management endpoint
 * Allows manual cache clearing (useful for development)
 */
app.post('/cache/clear', async (req, res) => {
  try {
    xmlParser.clearCache();
    logger.info('Cache cleared manually');

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
    });
  }
});

/**
 * Cache status endpoint
 * Returns current cache information
 */
app.get('/cache/status', (req, res) => {
  try {
    const status = xmlParser.getCacheStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error getting cache status:', error);
    res.status(500).json({
      error: 'Failed to get cache status',
    });
  }
});

// =============================================================================
// Error Handling
// =============================================================================

/**
 * 404 handler
 */
app.use((req, res) => {
  logger.warn(`404 - Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);

  const statusCode = err.statusCode || 500;
  const message = config.server.isProduction
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    error: 'Server Error',
    message,
    ...(config.server.isProduction ? {} : { stack: err.stack }),
  });
});

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Graceful shutdown handler
 */
function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

/**
 * Start server (only if not being required as a module)
 */
let server;

if (require.main === module) {
  server = app.listen(config.server.port, () => {
    logger.info(`Server running on port ${config.server.port}`);
    logger.info(`Environment: ${config.server.env}`);
    logger.info(`Cache TTL: ${config.xml.cacheTTL}ms`);
  });

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// Export app for testing
module.exports = app;
