# Cart/recommendation service (no Kafka). Build from the repo root:
#   docker build -f services/cart-recommendation-service/src/Dockerfile .
FROM node:20-slim

WORKDIR /app

COPY shared/prisma/package.json ./shared/prisma/package.json
COPY services/cart-recommendation-service/package.json ./services/cart-recommendation-service/package.json
COPY services/cart-recommendation-service/package-lock.json ./services/cart-recommendation-service/package-lock.json

WORKDIR /app/services/cart-recommendation-service
RUN npm ci

WORKDIR /app
COPY shared/prisma/ ./shared/prisma/
COPY services/cart-recommendation-service/ ./services/cart-recommendation-service/

WORKDIR /app/services/cart-recommendation-service
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cart" npx prisma generate --schema ../../shared/prisma/prisma/schema.prisma

ENV PORT=3005 NODE_ENV=production
EXPOSE 3005

CMD ["npx", "tsx", "src/index.ts"]
