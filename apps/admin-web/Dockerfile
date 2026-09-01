# Multi-stage Dockerfile for Next.js Admin Web (Production Hardened)
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/admin-web/ ./apps/admin-web/

RUN npm install
RUN npm --workspace=packages/shared-types run build
RUN npm --workspace=packages/financial-engine run build
RUN npm --workspace=apps/admin-web run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/admin-web ./apps/admin-web

USER nextjs
EXPOSE 3000

CMD ["npm", "--workspace=apps/admin-web", "run", "start"]
