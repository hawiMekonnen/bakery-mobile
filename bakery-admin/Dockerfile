# ==========================================
# STAGE 1: Build Vite React Admin Frontend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including Vite & devDependencies)
RUN npm install

# Copy application source code
COPY . .

# Compile optimized static bundle into /app/dist
RUN npm run build

# ==========================================
# STAGE 2: Production Node.js Server
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy package files
COPY package*.json ./

# Install only production runtime dependencies
RUN npm install --omit=dev

# Copy compiled frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend server code and default data
COPY server.js storage.js ./
COPY data ./data

# Expose port
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start production server
CMD ["node", "server.js"]
