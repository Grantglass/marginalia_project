# Use the official Node.js runtime as base image
FROM registry.access.redhat.com/ubi8/nodejs-18:latest

# Set the working directory
WORKDIR /opt/app-root/src

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user for OpenShift compatibility (if not already created by base image)
# The UBI Node.js image already provides this, but ensure proper permissions
USER 1001

# Expose the port the app runs on (OpenShift will map this dynamically)
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"]