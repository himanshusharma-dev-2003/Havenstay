# Multi-stage build for client + server is outside scope here; this Dockerfile focuses on the API server
FROM node:20-alpine AS builder
WORKDIR /app
COPY ./server/package*.json ./server/
COPY ./server/ ./server/
WORKDIR /app/server
RUN npm ci --production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/server /app
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
