# Multi-stage Dockerfile for NestJS API Backend (Production Hardened)
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY apps/api/ ./apps/api/

RUN npm install
RUN npm --workspace=apps/api run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api

USER nestjs
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/dashboard/metrics || exit 1

CMD ["npm", "--workspace=apps/api", "run", "start"]
