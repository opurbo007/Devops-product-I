# Payment service. Build from the repo root:
#   docker build -f services/payment-service/src/Dockerfile .
FROM node:20-slim

WORKDIR /app

COPY shared/prisma/package.json ./shared/prisma/package.json
COPY shared/platform/package.json ./shared/platform/package.json
COPY services/payment-service/package.json ./services/payment-service/package.json
COPY services/payment-service/package-lock.json ./services/payment-service/package-lock.json

WORKDIR /app/services/payment-service
RUN npm ci

WORKDIR /app
COPY shared/prisma/ ./shared/prisma/
COPY shared/platform/ ./shared/platform/
COPY services/payment-service/ ./services/payment-service/

WORKDIR /app/services/payment-service
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/payment" npx prisma generate --schema ../../shared/prisma/prisma/schema.prisma

ENV PORT=3003 NODE_ENV=production
EXPOSE 3003

CMD ["npx", "tsx", "src/index.ts"]
