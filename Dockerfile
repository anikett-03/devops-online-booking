# Stage 1: Build & Dependency Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies (clean install for production)
RUN npm ci --only=production

# Copy application source code
COPY . .

# Stage 2: Lightweight Production Execution Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Security best practice: Run app as non-root node user
USER node

# Copy built application and modules from builder stage
COPY --chown=node:node --from=builder /app ./

# Expose port
EXPOSE 3000

# Container Health check instruction
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["node", "src/server.js"]
