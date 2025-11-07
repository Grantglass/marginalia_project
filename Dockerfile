# Use the official Node.js runtime as base image
FROM registry.access.redhat.com/ubi8/nodejs-18:latest

# Set the working directory
WORKDIR /opt/app-root/src

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY config ./config
COPY services ./services
COPY utils ./utils
COPY images ./images
COPY server.js index.html client.js styles.css ./
COPY BB749.1.ms.xml ./

# Create logs directory with proper permissions
RUN mkdir -p logs && chmod 755 logs

# Ensure proper ownership for OpenShift
RUN chown -R 1001:0 /opt/app-root/src && \
    chmod -R g+rwX /opt/app-root/src

# Create non-root user for OpenShift compatibility
USER 1001

# Expose the port the app runs on
EXPOSE 3001

# Add health check using the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Set NODE_ENV to production
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    LOG_FORMAT=json

# Start the application
CMD ["node", "server.js"]