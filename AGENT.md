Project: Event-Driven E-Commerce Order Processing Platform

A from-scratch portfolio/resume project (not a business), designed to demonstrate production-grade backend architecture and DevOps depth to technical recruiters/interviewers — mirroring the kind of order-processing system Amazon/Shopify actually run.

Core problem being solved: placing an order must coordinate inventory reservation, payment, shipping, and notifications — and stay consistent even when any step fails (e.g. payment fails after inventory is reserved).

Backend architecture — 6 microservices:

Order Service — saga orchestrator, tracks order state
Inventory Service — reserve/release stock
Payment Service — mock payment processing, wrapped in a circuit breaker (opossum) around the external-call simulation
Shipping Service — fulfillment/tracking
Cart/Recommendation Service
Notification Service — email/SMS (mock), also circuit-breaker wrapped

Data layer: All-PostgreSQL system of record across every service (deliberately dropped MongoDB — one consistent DB technology). Redis used only as a cache/rate-limiter at the API Gateway, not as a data store. Using the raw pg driver (not Prisma) intentionally, to learn transactions/SQL directly rather than through an ORM abstraction.

Messaging: Kafka, with each service communicating only via events (no direct service-to-service calls). Key distributed-systems patterns implemented: saga pattern (compensating events, e.g. inventory.release on payment failure), idempotency keys (dedup against Kafka's at-least-once delivery), outbox pattern (atomic DB write + event publish), and dead-letter queues for failed message handling.

Auth: JWT access + refresh tokens for customers, RBAC for admin role, and separately-signed internal JWTs minted by the API Gateway for service-to-service trust. All auth enforcement happens at the Gateway — backend services just validate the internal JWT.

Frontend: Two separate Next.js + TypeScript + Tailwind + shadcn/ui apps — a customer storefront (home/products/cart/checkout/orders/tracking) and an admin ops dashboard (orders, inventory, event monitoring, DLQ management, service health, live saga/event-flow visualization). Both talk only through the API Gateway. Currently built against mock data, pending real API integration.

Notable feature: the admin dashboard includes a manual per-service "kill switch" for chaos/resilience testing — an admin can fail Inventory, Payment, etc. on demand and watch the rest of the system's retry/DLQ/compensation behavior in real time.

Infra (planned, not yet built): Docker → Kubernetes (per-service Deployments + HPA) → Terraform for provisioning → Prometheus/Grafana + Jaeger/OpenTelemetry for observability → GitHub Actions per-service CI/CD with path filtering → k6 load testing to validate autoscaling.

Package manager: npm workspaces (monorepo), not pnpm/yarn.