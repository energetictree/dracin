# Development Dockerfile for Dracin App
# This Dockerfile sets up the environment but relies on volume mounts for the actual source code

FROM node:20-alpine

# Install dependencies for native modules (if needed)
RUN apk add --no-cache git

# Create app directory
WORKDIR /app

# Copy package files first (these are less likely to change than source code)
# This allows Docker to cache the npm install layer
COPY package*.json ./

# Install dependencies
# Using --legacy-peer-deps if there are peer dependency issues
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Expose Vite dev server port
EXPOSE 5173

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
