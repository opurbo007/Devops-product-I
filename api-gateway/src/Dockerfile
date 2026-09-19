# API gateway. Build from the repo root:
#   docker build -f api-gateway/src/Dockerfile .
FROM node:20-slim

WORKDIR /app

COPY shared/prisma/package.json ./shared/prisma/package.json
COPY api-gateway/package.json ./api-gateway/package.json
COPY api-gateway/package-lock.json ./api-gateway/package-lock.json

WORKDIR /app/api-gateway
RUN npm ci

WORKDIR /app
COPY shared/prisma/ ./shared/prisma/
COPY api-gateway/ ./api-gateway/

WORKDIR /app/api-gateway
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app" npx prisma generate --schema ../shared/prisma/prisma/schema.prisma

ENV PORT=8080 NODE_ENV=production
EXPOSE 8080

CMD ["npx", "tsx", "src/index.ts"]
