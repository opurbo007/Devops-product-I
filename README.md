# Event-Driven E-Commerce Order Processing Platform

From-scratch portfolio project demonstrating production-grade backend
architecture: 6 Kafka-choreographed microservices behind an API gateway,
saga orchestration with compensation, and K8s-ready infra.

## Services

| Service | Port | Role |
|---|---|---|
| api-gateway | 8080 | JWT auth, per-service proxy, Redis rate limiting |
| order-service | 3000 | Saga orchestrator, order state + cancel |
| inventory-service | 3001 | Stock reserve/release, compensation |
| shipping-service | 3002 | Fulfillment, tracking |
| payment-service | 3003 | Stripe-style provider (mock default), refunds |
| notification-service | 3004 | Event-driven email/SMS (mock) |
| cart-recommendation-service | 3005 | Carts + frequently-bought-together |

Shared packages: `shared/prisma` (single Prisma schema + migrations),
`shared/platform` (DLQ helpers, chaos flags, Prometheus metrics),
`shared/event-schemas` (event types).

## Quickstart (docker-compose)

```sh
cd infrastructure
cp .env.example .env   # set POSTGRES_PASSWORD
docker compose up --build
```

Then per service DB (example: inventory):

```sh
cd ../services/inventory-service
npm run db:migrate      # Prisma 0001_init into its database
npm run seed            # demo SKUs
```

Demo saga: `POST /auth/register` → `POST /auth/login` → `POST /api/orders`
at `localhost:8080`, then poll `GET /api/orders/:id` —
`pending → reserved → paid → shipped`.

## Ops

- Dead letters: `GET /api/<svc>/admin/dlq`, replay via
  `POST /api/<svc>/admin/dlq/replay` (admin, idempotent).
- Chaos kill-switches (admin, runtime, no restart):
  `GET|POST /api/<svc>/admin/chaos`
  (`INVENTORY_FAIL_RESERVE`, `PAYMENT_DECLINE_CODE`, `SHIPPING_FAIL_DISPATCH`,
  `NOTIFICATION_FAIL`, `ORDER_FAIL_SAGA`).
- Chaos Lab (`/chaos` in the admin dashboard): guided outage scenarios,
  order journey timer, load bursts, live circuit-breaker states, fleet health.
- Metrics: every service exposes `GET /metrics`; Prometheus + Grafana ship in
  compose (ports 9090 / 3100).
- Load tests: `k6 run load-tests/smoke.js`, `k6 run load-tests/order-flow.js`.
- Kubernetes: `infrastructure/kubernetes/` (namespace, data layer,
  per-service Deployments + Services + HPA).

See `AGENT.md` for the full architecture brief.
