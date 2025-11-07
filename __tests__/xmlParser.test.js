/**
 * XML Parser Service Tests
 */

const xmlParser = require('../services/xmlParser');

// Mock the logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('XML Parser Service', () => {
  beforeEach(() => {
    // Clear cache before each test
    xmlParser.clearCache();
  });

  describe('getCacheStatus', () => {
    it('should return cache status', () => {
      const status = xmlParser.getCacheStatus();

      expect(status).toHaveProperty('isCached');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('age');
      expect(status).toHaveProperty('itemCount');
    });

    it('should show empty cache initially', () => {
      const status = xmlParser.getCacheStatus();

      expect(status.isCached).toBe(false);
      expect(status.itemCount).toBe(0);
      expect(status.timestamp).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear the cache without errors', () => {
      expect(() => xmlParser.clearCache()).not.toThrow();
    });
  });

  describe('getTranscriptions', () => {
    it('should load and parse transcriptions', async () => {
      const transcriptions = await xmlParser.getTranscriptions();

      expect(Array.isArray(transcriptions)).toBe(true);
      if (transcriptions.length > 0) {
        expect(transcriptions[0]).toHaveProperty('id');
        expect(transcriptions[0]).toHaveProperty('image');
        expect(transcriptions[0]).toHaveProperty('textData');
      }
    });

    it('should cache transcriptions on subsequent calls', async () => {
      // First call
      await xmlParser.getTranscriptions();
      const status1 = xmlParser.getCacheStatus();

      expect(status1.isCached).toBe(true);

      // Second call should use cache
      await xmlParser.getTranscriptions();
      const status2 = xmlParser.getCacheStatus();

      expect(status2.timestamp).toBe(status1.timestamp);
    });

    it('should refresh cache when forceRefresh is true', async () => {
      // First call
      await xmlParser.getTranscriptions();
      const status1 = xmlParser.getCacheStatus();

      // Wait a tiny bit to ensure timestamp would be different
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Force refresh
      await xmlParser.getTranscriptions(undefined, true);
      const status2 = xmlParser.getCacheStatus();

      expect(status2.timestamp).not.toBe(status1.timestamp);
    });

    it('should reject invalid file paths', async () => {
      await expect(xmlParser.getTranscriptions('/etc/passwd')).rejects.toThrow(
        'Invalid file path'
      );
    });
  });

  describe('parseXml', () => {
    it('should parse valid XML data', async () => {
      const sampleXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <bad>
          <objdesc>
            <desc>
              <phystext>
                <zone type="Blake">
                  <zone points="100,100 200,100 200,200 100,200">
                    <lg>
                      <l>Sample text</l>
                    </lg>
                  </zone>
                </zone>
              </phystext>
            </desc>
          </objdesc>
        </bad>
      `;

      const result = await xmlParser.parseXml(sampleXml);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for empty XML', async () => {
      const emptyXml = '<?xml version="1.0" encoding="UTF-8"?><root></root>';

      const result = await xmlParser.parseXml(emptyXml);
      expect(result).toEqual([]);
    });

    it('should throw error for invalid XML', async () => {
      const invalidXml = 'This is not valid XML';

      await expect(xmlParser.parseXml(invalidXml)).rejects.toThrow();
    });
  });
});
