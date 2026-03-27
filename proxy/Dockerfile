# Dracin API Proxy Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY server.js ./

# Expose proxy port
EXPOSE 3001

# Start the proxy server
CMD ["node", "server.js"]
