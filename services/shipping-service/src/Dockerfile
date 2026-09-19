# Shipping service. Build from the repo root:
#   docker build -f services/shipping-service/src/Dockerfile .
FROM node:20-slim

WORKDIR /app

COPY shared/prisma/package.json ./shared/prisma/package.json
COPY shared/platform/package.json ./shared/platform/package.json
COPY services/shipping-service/package.json ./services/shipping-service/package.json
COPY services/shipping-service/package-lock.json ./services/shipping-service/package-lock.json

WORKDIR /app/services/shipping-service
RUN npm ci

WORKDIR /app
COPY shared/prisma/ ./shared/prisma/
COPY shared/platform/ ./shared/platform/
COPY services/shipping-service/ ./services/shipping-service/

WORKDIR /app/services/shipping-service
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shipping" npx prisma generate --schema ../../shared/prisma/prisma/schema.prisma

ENV PORT=3002 NODE_ENV=production
EXPOSE 3002

CMD ["npx", "tsx", "src/index.ts"]
