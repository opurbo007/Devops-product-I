Project: Event-Driven E-Commerce Order Processing Platform

A from-scratch portfolio/resume project (not a business), designed to demonstrate production-grade backend architecture and DevOps depth to technical recruiters/interviewers — mirroring the kind of order-processing system Amazon/Shopify actually run.

Core problem being solved: placing an order must coordinate inventory reservation, payment, shipping, and notifications — and stay consistent even when any step fails (e.g. payment fails after inventory is reserved).

Backend architecture — 6 microservices:

Order Service — saga orchestrator, tracks order state
Inventory Service — reserve/release stock
Payment Service — Stripe-style provider abstraction (mock default, real Stripe via PAYMENT_PROVIDER=stripe), wrapped in a custom circuit breaker around the external call
Shipping Service — fulfillment/tracking
Cart/Recommendation Service
Notification Service — email/SMS (mock), also circuit-breaker wrapped

Data layer: All-PostgreSQL system of record across every service (deliberately dropped MongoDB — one consistent DB technology). Redis used only as a cache/rate-limiter at the API Gateway, not as a data store. Prisma ORM via the shared `shared/prisma` package (single schema + `prisma/migrations` as the migration source of truth); every service imports `prisma` from `shared-prisma` (`src/db/prisma.ts`) and uses `prisma.$transaction` for saga/outbox atomicity. Row-locking reads (`SELECT ... FOR UPDATE SKIP LOCKED` for the outbox relay, `FOR UPDATE` on stock) go through `claimOutboxRows`/`$queryRaw` on the transaction client.

Messaging: Kafka, with each service communicating only via events (no direct service-to-service calls). Key distributed-systems patterns implemented: saga pattern (compensating events, e.g. inventory.release on payment failure), idempotency keys (dedup against Kafka's at-least-once delivery), outbox pattern (atomic DB write + event publish), and dead-letter queues (`<topic>.DLQ` via `shared-platform` `withDlq`, with peek/replay at `POST /admin/dlq/replay`).

Auth: JWT access + refresh tokens for customers, RBAC for admin role, and separately-signed internal JWTs minted by the API Gateway for service-to-service trust. All auth enforcement happens at the Gateway — backend services just validate the internal JWT.

Frontend: Two separate Next.js + TypeScript + Tailwind + shadcn/ui apps — a customer storefront (home/products/cart/checkout/orders/tracking) and an admin ops dashboard (orders, inventory, event monitoring, DLQ management, service health, live saga/event-flow visualization). Both talk only through the API Gateway. Currently built against mock data, pending real API integration.

Notable feature: the admin dashboard includes a manual per-service "kill switch" for chaos/resilience testing — backed by runtime `GET|POST /admin/chaos` toggles in every service (no restart), so an admin can fail Inventory, Payment, etc. on demand and watch retry/DLQ/compensation in real time.

Infra (built): Dockerfiles + docker-compose (all services, Redis, per-service DBs, Prometheus/Grafana) → Kubernetes (per-service Deployments + Services + HPA, data-layer StatefulSets) → Prometheus/Grafana configs + per-service /metrics → GitHub Actions per-service CI with path filtering → k6 smoke + order-flow load tests. Still planned: Terraform provisioning, frontend real-API integration, Jaeger/OpenTelemetry tracing.

Package manager: npm workspaces (monorepo), not pnpm/yarn.