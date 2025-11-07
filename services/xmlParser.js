/**
 * XML Parser Service
 * Handles parsing of Blake marginalia XML files
 */

const fs = require('fs').promises;
const xml2js = require('xml2js');
const config = require('../config/config');
const logger = require('../utils/logger');

// In-memory cache for parsed XML data
let cachedTranscriptions = null;
let cacheTimestamp = null;

/**
 * Validates XML file path to prevent path traversal attacks
 * @param {string} filePath - File path to validate
 * @returns {boolean} - Whether the path is valid
 */
function isValidFilePath(filePath) {
  // Only allow reading from the project directory
  const allowedPath = config.xml.filePath;
  return filePath === allowedPath;
}

/**
 * Determines the type of marginalia based on content and attributes
 * @param {string} text - The marginalia text
 * @param {object} zoneAttributes - XML zone attributes
 * @returns {string} - Type of marginalia (criticism, reference, correction, note)
 */
function determineType(text, zoneAttributes = {}) {
  const trimmedText = text.trim().toLowerCase();

  if (
    trimmedText.includes('contemptible') ||
    trimmedText.includes('horrible') ||
    trimmedText.includes('folly') ||
    trimmedText.includes('dishonest')
  ) {
    return 'criticism';
  }

  if (
    trimmedText.includes('read') ||
    trimmedText.includes('chap') ||
    trimmedText.includes('bible') ||
    trimmedText.includes('paine')
  ) {
    return 'reference';
  }

  if (zoneAttributes.type && zoneAttributes.type.includes('deletion')) {
    return 'correction';
  }

  return 'note';
}

/**
 * Extracts coordinate points from zone and calculates boundaries
 * @param {string} pointsString - Space-separated coordinate points
 * @returns {object} - Boundary coordinates and dimensions
 */
function extractCoordinates(pointsString) {
  const points = pointsString.split(' ').map((point) => {
    const [x, y] = point.split(',').map(Number);
    return { x, y };
  });

  const top = Math.min(...points.map((p) => p.y));
  const left = Math.min(...points.map((p) => p.x));
  const bottom = Math.max(...points.map((p) => p.y));
  const right = Math.max(...points.map((p) => p.x));

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Converts pixel coordinates to percentages
 * @param {object} coords - Pixel coordinates
 * @param {string} pageId - Page identifier for specific adjustments
 * @returns {object} - Percentage-based coordinates
 */
function convertToPercentages(coords, pageId) {
  const { standardWidth, standardHeight } = config.images;

  let topPercent = (coords.top / standardHeight) * 100;
  const leftPercent = (coords.left / standardWidth) * 100;
  const widthPercent = (coords.width / standardWidth) * 100;
  const heightPercent = (coords.height / standardHeight) * 100;

  // Apply page-specific adjustments
  const adjustment = config.pageAdjustments[pageId];
  if (adjustment && adjustment.topAdjustment) {
    topPercent = Math.max(0, topPercent + adjustment.topAdjustment);
  }

  return {
    top: topPercent,
    left: leftPercent,
    width: widthPercent,
    height: heightPercent,
  };
}

/**
 * Processes a single line of marginalia text
 * @param {object} line - Line object from XML
 * @returns {string} - Extracted text content
 */
function extractLineText(line) {
  if (line._ !== undefined) {
    return line._;
  }
  if (typeof line === 'string') {
    return line;
  }
  return '';
}

/**
 * Processes marginalia zones and extracts transcription data
 * @param {object} page - Page object from parsed XML
 * @returns {object|null} - Transcription data or null
 */
function processPage(page) {
  if (!page || !page.phystext || !page.phystext[0] || !page.phystext[0].zone || !page.$) {
    return null;
  }

  const pageId = page.$.id;
  const dbi = page.$.dbi;

  if (!dbi) {
    return null;
  }

  const zones = page.phystext[0].zone;
  const textData = [];

  zones.forEach((zone) => {
    // Look for Blake marginalia zones
    if (zone.$ && zone.$.type === 'Blake' && zone.zone) {
      zone.zone.forEach((marginaliaZone) => {
        if (
          marginaliaZone.$ &&
          marginaliaZone.$.points &&
          marginaliaZone.lg &&
          marginaliaZone.lg[0] &&
          marginaliaZone.lg[0].l
        ) {
          const coords = extractCoordinates(marginaliaZone.$.points);
          const percentCoords = convertToPercentages(coords, pageId);
          const lines = marginaliaZone.lg[0].l;
          const lineHeight = percentCoords.height / lines.length;

          lines.forEach((line, index) => {
            const text = extractLineText(line).trim();

            if (text) {
              const lineTop = percentCoords.top + index * lineHeight;
              const type = determineType(text, marginaliaZone.$);

              textData.push({
                text,
                top: lineTop,
                left: percentCoords.left,
                width: percentCoords.width,
                height: lineHeight,
                type,
              });
            }
          });
        }
      });
    }
  });

  if (textData.length === 0) {
    return null;
  }

  return {
    id: pageId,
    image: `/images/${dbi}.300.jpg`,
    textData,
  };
}

/**
 * Parses XML data and extracts transcriptions
 * @param {string} xmlData - Raw XML string
 * @returns {Promise<Array>} - Array of transcription objects
 */
async function parseXml(xmlData) {
  const parser = new xml2js.Parser({
    explicitArray: true,
    mergeAttrs: false,
    xmlns: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
  });

  try {
    const result = await parser.parseStringPromise(xmlData);
    logger.debug('XML parsed successfully');

    if (!result || !result.bad || !result.bad.objdesc || !result.bad.objdesc[0]) {
      logger.warn('XML structure does not match expected format');
      return [];
    }

    const desc = result.bad.objdesc[0].desc;
    if (!desc) {
      logger.warn('No description elements found in XML');
      return [];
    }

    const transcriptions = [];

    desc.forEach((page) => {
      const processedPage = processPage(page);
      if (processedPage) {
        transcriptions.push(processedPage);
      }
    });

    logger.info(`Extracted ${transcriptions.length} transcriptions`);
    return transcriptions;
  } catch (error) {
    logger.error('Error parsing XML:', error);
    throw new Error('Failed to parse XML data');
  }
}

/**
 * Reads and parses XML file with caching
 * @param {string} filePath - Path to XML file
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} - Array of transcription objects
 */
async function getTranscriptions(filePath = config.xml.filePath, forceRefresh = false) {
  // Validate file path
  if (!isValidFilePath(filePath)) {
    logger.error(`Invalid file path requested: ${filePath}`);
    throw new Error('Invalid file path');
  }

  // Check cache
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedTranscriptions &&
    cacheTimestamp &&
    now - cacheTimestamp < config.xml.cacheTTL
  ) {
    logger.debug('Returning cached transcriptions');
    return cachedTranscriptions;
  }

  try {
    logger.info(`Reading XML file: ${filePath}`);
    const xmlData = await fs.readFile(filePath, 'utf8');

    const transcriptions = await parseXml(xmlData);

    // Update cache
    cachedTranscriptions = transcriptions;
    cacheTimestamp = now;

    return transcriptions;
  } catch (error) {
    logger.error(`Error reading XML file ${filePath}:`, error);

    // Return cached data if available, even if expired
    if (cachedTranscriptions) {
      logger.warn('Returning stale cached data due to read error');
      return cachedTranscriptions;
    }

    throw new Error('Failed to read transcriptions');
  }
}

/**
 * Clears the transcription cache
 */
function clearCache() {
  cachedTranscriptions = null;
  cacheTimestamp = null;
  logger.info('Transcription cache cleared');
}

/**
 * Gets cache status
 * @returns {object} - Cache status information
 */
function getCacheStatus() {
  return {
    isCached: cachedTranscriptions !== null,
    timestamp: cacheTimestamp,
    age: cacheTimestamp ? Date.now() - cacheTimestamp : null,
    itemCount: cachedTranscriptions ? cachedTranscriptions.length : 0,
  };
}

module.exports = {
  getTranscriptions,
  parseXml,
  clearCache,
  getCacheStatus,
};
