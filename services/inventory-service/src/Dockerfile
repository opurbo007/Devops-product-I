# Inventory service. Build from the repo root:
#   docker build -f services/inventory-service/src/Dockerfile .
FROM node:20-slim

WORKDIR /app

COPY shared/prisma/package.json ./shared/prisma/package.json
COPY shared/platform/package.json ./shared/platform/package.json
COPY services/inventory-service/package.json ./services/inventory-service/package.json
COPY services/inventory-service/package-lock.json ./services/inventory-service/package-lock.json

WORKDIR /app/services/inventory-service
RUN npm ci

WORKDIR /app
COPY shared/prisma/ ./shared/prisma/
COPY shared/platform/ ./shared/platform/
COPY services/inventory-service/ ./services/inventory-service/

WORKDIR /app/services/inventory-service
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/inventory" npx prisma generate --schema ../../shared/prisma/prisma/schema.prisma

ENV PORT=3001 NODE_ENV=production UPLOAD_DIR=/app/uploads
EXPOSE 3001
RUN mkdir -p /app/uploads

CMD ["npx", "tsx", "src/index.ts"]
