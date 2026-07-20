FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig.json ./

# Install dependencies (including devDependencies required for compilation)
RUN npm ci

# Copy application source code
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Expose API port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Start server from compiled JavaScript
CMD ["node", "dist/server.js"]
