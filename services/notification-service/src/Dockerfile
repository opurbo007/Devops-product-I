# Notification service. Build from the repo root:
#   docker build -f services/notification-service/src/Dockerfile .
FROM node:20-slim

WORKDIR /app

COPY shared/prisma/package.json ./shared/prisma/package.json
COPY shared/platform/package.json ./shared/platform/package.json
COPY services/notification-service/package.json ./services/notification-service/package.json
COPY services/notification-service/package-lock.json ./services/notification-service/package-lock.json

WORKDIR /app/services/notification-service
RUN npm ci

WORKDIR /app
COPY shared/prisma/ ./shared/prisma/
COPY shared/platform/ ./shared/platform/
COPY services/notification-service/ ./services/notification-service/

WORKDIR /app/services/notification-service
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notification" npx prisma generate --schema ../../shared/prisma/prisma/schema.prisma

ENV PORT=3004 NODE_ENV=production
EXPOSE 3004

CMD ["npx", "tsx", "src/index.ts"]
