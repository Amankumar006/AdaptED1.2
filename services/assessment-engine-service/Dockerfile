FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci && npm cache clean --force
COPY src/ ./src/
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S assessmentservice -u 1001
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN mkdir -p logs && chown -R assessmentservice:nodejs logs
USER assessmentservice
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
CMD ["node", "dist/index.js"]
