# syntax=docker/dockerfile:1

# ────────────────────────────────────────────────────────────────────
# Stage 1 — Build (install only production dependencies)
# ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
LABEL stage=builder

WORKDIR /app

# Copy manifest files first so Docker can cache this layer
COPY server/package*.json ./

# ci — uses package-lock.json for reproducible installs
RUN npm ci --only=production

# ────────────────────────────────────────────────────────────────────
# Stage 2 — Runtime (lean image, no dev tools)
# ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

LABEL org.opencontainers.image.title="HavenStay API"
LABEL org.opencontainers.image.description="HavenStay hotel booking REST API"
LABEL org.opencontainers.image.source="https://github.com/himanshu/havenstay"

WORKDIR /app

# Copy installed modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY server/ ./

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Security: run as non-root user (Node.js official image includes the 'node' user)
USER node

# Liveness probe — lightweight HTTP check against the health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
