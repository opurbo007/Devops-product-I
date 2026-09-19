# Order service. Build from the repo root:
#   docker build -f services/order-service/src/Dockerfile .
FROM node:20-slim

WORKDIR /app

# Manifests first for layer caching.
COPY shared/prisma/package.json ./shared/prisma/package.json
COPY shared/platform/package.json ./shared/platform/package.json
COPY services/order-service/package.json ./services/order-service/package.json
COPY services/order-service/package-lock.json ./services/order-service/package-lock.json

WORKDIR /app/services/order-service
RUN npm ci

# Sources + shared packages.
WORKDIR /app
COPY shared/prisma/ ./shared/prisma/
COPY shared/platform/ ./shared/platform/
COPY services/order-service/ ./services/order-service/

WORKDIR /app/services/order-service
# DATABASE_URL is needed at generate time only; runtime uses env.
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app" npx prisma generate --schema ../../shared/prisma/prisma/schema.prisma

ENV PORT=3000 NODE_ENV=production
EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
