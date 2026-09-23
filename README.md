# Event-Driven E-Commerce Order Processing Platform

From-scratch portfolio project demonstrating production-grade backend
architecture: 6 Kafka-choreographed microservices behind an API gateway,
saga orchestration with compensation, and K8s-ready infra.

## Services

| Service | Port | Role |
|---|---|---|
| api-gateway | 8081 | JWT auth, per-service proxy, Redis rate limiting |
| order-service | 3000 | Saga orchestrator, order state + cancel |
| inventory-service | 3001 | Stock reserve/release, compensation |
| shipping-service | 3002 | Fulfillment, tracking |
| payment-service | 3003 | Stripe-style provider (mock default), refunds |
| notification-service | 3004 | Event-driven email/SMS (mock) |
| cart-recommendation-service | 3005 | Carts + frequently-bought-together |
| storefront (frontend) | 3006 | Customer shop (Next.js, mock data) |
| admin-dashboard (frontend) | 3007 | Ops dashboard incl. Chaos Lab (Next.js, mock data) |

Shared packages: `shared/prisma` (single Prisma schema + migrations),
`shared/platform` (DLQ helpers, chaos flags, Prometheus metrics),
`shared/event-schemas` (event types).

## Quickstart (full stack with frontend)

> Windows one-click (opens everything as tabs in Windows Terminal):
> - `start-all.bat` — first run / full reset: infra + all migrations (+ seed)
>   + every backend and frontend.
> - `start-services.bat` — daily start: just the 9 servers, no Docker,
>   no migrations (infra must already be up via
>   `cd infrastructure` + `docker compose up -d`).
> Steps below are the manual equivalent.

### 1. Backend — Postgres + Kafka + Redis + 6 services + gateway + observability

```sh
cd infrastructure
cp .env.example .env   # set POSTGRES_PASSWORD
docker compose up --build
```

Ports: gateway `8081`, services `3000-3005`, Prometheus `9090`, Grafana `3100`.

> Windows note: port `8080` is often taken by EDB Postgres' bundled Apache
> (`httpd.exe`), which returns an HTML `404 Not Found` for unknown paths. This
> repo therefore runs the gateway on **`8081`** (`PORT=8081` in
> `api-gateway/.env`, `GATEWAY_PORT=8081` in `infrastructure/.env`). If you see
> that HTML 404 on `:8080`, you're hitting Apache, not the gateway.

### 2. Databases — one migrate per service DB (from the repo root)

Each service has its own Postgres DB; the shared Prisma schema (`shared/prisma`)
is migrated into every DB. `DATABASE_URL` is auto-synthesized from the
service `.env` (`POSTGRES_DB`, etc.), so no extra env setup is needed:

```powershell
cd services/order-service; npm install; npm run db:migrate; cd ../..
cd services/inventory-service; npm install; npm run db:migrate; npm run seed; cd ../..
cd services/shipping-service; npm install; npm run db:migrate; cd ../..
cd services/payment-service; npm install; npm run db:migrate; cd ../..
cd services/notification-service; npm install; npm run db:migrate; cd ../..
cd services/cart-recommendation-service; npm install; npm run db:migrate; cd ../..
```

Bash / zsh equivalent (replace `;` with `&&` if you want stop-on-error):

```sh
cd services/order-service && npm install && npm run db:migrate && cd ../..
cd services/inventory-service && npm install && npm run db:migrate && npm run seed && cd ../..
cd services/shipping-service && npm install && npm run db:migrate && cd ../..
cd services/payment-service && npm install && npm run db:migrate && cd ../..
cd services/notification-service && npm install && npm run db:migrate && cd ../..
cd services/cart-recommendation-service && npm install && npm run db:migrate && cd ../..
```

Single-service example (inventory):

```sh
cd services/inventory-service
npm run db:migrate      # Prisma 0001_init into its database
npm run seed            # demo SKUs
```

### 3. Frontend — storefront + admin dashboard (2 terminals)

Both are Next.js apps talking to the gateway at `http://localhost:8081`
(copy `frontend/*/.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL`
— already done if you cloned after this change). They currently run
against mock data, pending real API integration. Default `next dev` port
`3000` clashes with `order-service`, so use `3006`/`3007`:

```sh
# Terminal A
cd frontend/storefront
npm install
npm run dev -- --port 3006   # http://localhost:3006

# Terminal B
cd frontend/admin-dashboard
npm install
npm run dev -- --port 3007   # http://localhost:3007/chaos for Chaos Lab
```

Demo saga: `POST /auth/register` → `POST /auth/login` → `POST /api/orders`
at `localhost:8081`, then poll `GET /api/orders/:id` —
`pending → reserved → paid → shipped`.

## Ops

- Dead letters: `GET /api/<svc>/admin/dlq`, replay via
  `POST /api/<svc>/admin/dlq/replay` (admin, idempotent).
- Chaos kill-switches (admin, runtime, no restart):
  `GET|POST /api/<svc>/admin/chaos`
  (`INVENTORY_FAIL_RESERVE`, `PAYMENT_DECLINE_CODE`, `SHIPPING_FAIL_DISPATCH`,
  `NOTIFICATION_FAIL`, `ORDER_FAIL_SAGA`, plus image pipeline:
  `IMAGE_FAIL_UPLOAD`, `IMAGE_FAIL_WEBP`, `IMAGE_SKIP_WEBP`, `IMAGE_FAIL_SERVE`).
- Product images (inventory-service): `PUT /api/inventory/products/:sku`
  (external URL), `POST /api/inventory/products/:sku/image` (multipart upload,
  auto-WebP via sharp), public `GET /api/inventory/images/*` + `GET /api/inventory/products*`.
- Chaos Lab (`/chaos` in the admin dashboard): guided outage scenarios,
  order journey timer, load bursts, live circuit-breaker states, fleet health.
- Metrics: every service exposes `GET /metrics`; Prometheus + Grafana ship in
  compose (ports 9090 / 3100).
- Load tests: `k6 run load-tests/smoke.js`, `k6 run load-tests/order-flow.js`.
- Kubernetes: `infrastructure/kubernetes/` (namespace, data layer,
  per-service Deployments + Services + HPA).

See `AGENT.md` for the full architecture brief.
