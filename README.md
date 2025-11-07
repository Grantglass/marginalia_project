# Marginalia Project

A web application for viewing and interacting with William Blake's manuscript annotations (marginalia). The application parses XML transcription files and overlays the text on high-resolution manuscript images with an interactive interface.

## Features

- **Interactive Viewer**: Click on hotspots to reveal Blake's handwritten annotations
- **Type Classification**: Color-coded marginalia by type (criticism, reference, correction, note)
- **Show/Hide Toggle**: Toggle all annotations on/off for easier reading
- **Responsive Design**: Works on desktop and mobile devices
- **Performance Optimized**: Caching, compression, and efficient XML parsing
- **Security Hardened**: Helmet.js, CORS, rate limiting, and input validation
- **Production Ready**: Comprehensive logging, error handling, and health checks

## Tech Stack

- **Backend**: Node.js, Express.js
- **XML Parsing**: xml2js
- **Security**: Helmet, CORS, express-rate-limit
- **Logging**: Winston
- **Testing**: Jest, Supertest
- **Deployment**: Docker, OpenShift

## Project Structure

```
marginalia_project/
├── config/
│   └── config.js           # Centralized configuration
├── services/
│   └── xmlParser.js        # XML parsing and caching logic
├── utils/
│   └── logger.js           # Winston logger configuration
├── __tests__/
│   ├── server.test.js      # Server integration tests
│   └── xmlParser.test.js   # XML parser unit tests
├── images/                 # Manuscript images
├── server.js               # Main Express server
├── index.html              # Frontend viewer interface
├── client.js               # Client-side utilities
├── styles.css              # Custom styles
├── package.json            # Dependencies and scripts
├── Dockerfile              # Docker configuration
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd marginalia_project
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:3001`

## Configuration

Environment variables can be configured in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Environment (development/production) |
| `XML_FILE_PATH` | BB749.1.ms.xml | Path to XML transcription file |
| `CACHE_TTL` | 3600000 | Cache time-to-live in milliseconds (1 hour) |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |
| `CORS_ORIGIN` | * | CORS allowed origins |
| `LOG_LEVEL` | info | Logging level (error, warn, info, debug) |
| `LOG_FORMAT` | json | Log format (json or text) |

## API Endpoints

### GET /
Serves the main HTML viewer interface.

### GET /transcriptions
Returns all transcription data as JSON.

**Query Parameters:**
- `refresh=true` - Force cache refresh

**Response:**
```json
[
  {
    "id": "bb749.1.ms.01",
    "image": "/images/BB749.1.01.300.jpg",
    "textData": [
      {
        "text": "Sample marginalia",
        "top": 10.5,
        "left": 20.3,
        "width": 15.2,
        "height": 2.1,
        "type": "note"
      }
    ]
  }
]
```

### GET /health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 12345,
  "environment": "production",
  "cache": {
    "isCached": true,
    "itemCount": 5
  }
}
```

### GET /cache/status
Returns current cache information.

### POST /cache/clear
Manually clears the cache (useful for development).

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

## Docker Deployment

### Build the Docker image:
```bash
docker build -t marginalia-project .
```

### Run the container:
```bash
docker run -p 3001:3001 marginalia-project
```

### With environment variables:
```bash
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  marginalia-project
```

## OpenShift Deployment

Deploy using the provided template:
```bash
./deploy-to-openshift.sh
```

Or manually:
```bash
oc process -f openshift-template.yaml | oc apply -f -
```

## Security Features

- **Helmet.js**: Sets security-related HTTP headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevents abuse of API endpoints
- **Input Validation**: Path traversal protection
- **CSP**: Content Security Policy headers
- **Error Handling**: Sanitized error messages in production

## Performance Optimizations

- **Caching**: In-memory caching of parsed XML data (configurable TTL)
- **Compression**: Gzip compression for responses
- **Async/Await**: Non-blocking I/O operations
- **Static File Serving**: Optimized static asset delivery

## Logging

The application uses Winston for structured logging:

- Console output with color coding (development)
- File rotation in production (`logs/` directory)
- Configurable log levels
- JSON or text format support

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code Quality

The codebase follows these principles:

- **Separation of Concerns**: Logic separated into services, utils, and config
- **DRY**: No duplicate code
- **Error Handling**: Comprehensive try-catch and error middleware
- **Documentation**: JSDoc comments for all functions
- **Testing**: Unit and integration tests
- **Modern JavaScript**: Async/await, ES6+ features

## Troubleshooting

### Port already in use
Change the `PORT` environment variable in `.env`

### XML parsing errors
Verify the XML file path in configuration and ensure the file is well-formed

### Images not loading
Check that images are in the `images/` directory and match the DBI values in the XML

### Cache issues
Use `/cache/clear` endpoint or restart the server to clear cache

## License

ISC

## Authors

Marginalia Project Team

## Acknowledgments

- William Blake Archive for the manuscript data
- OpenShift for hosting infrastructure
