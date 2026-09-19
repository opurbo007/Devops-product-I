-- Prisma initial migration: consolidates all pre-existing raw-SQL migrations
-- (api-gateway users; order-service orders/outbox/processed_events; inventory
-- stock+reservations/outbox/processed_events; payment payments/outbox/
-- processed_events; shipping shipments/outbox/processed_events; cart items;
-- notification notifications/outbox/processed_events) into one shared schema.
-- Every service DB gets all tables; services only touch their own subset.

-- Users (api-gateway)
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");

-- Orders (order-service)
CREATE TABLE IF NOT EXISTS "orders" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_orders_customer_id" ON "orders" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" ("status");

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_orders_updated_at ON "orders";
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON "orders"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Stock + reservations (inventory-service)
CREATE TABLE IF NOT EXISTS "stock" (
    "sku" TEXT NOT NULL PRIMARY KEY,
    "available_quantity" INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0)
);

CREATE TABLE IF NOT EXISTS "reservations" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL CHECK (quantity > 0),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE ("order_id", "sku")
);
CREATE INDEX IF NOT EXISTS "idx_reservations_order_id" ON "reservations" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_reservations_status" ON "reservations" ("status");

-- Payments (payment-service)
CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL UNIQUE,
    "status" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "provider_reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments" ("status");

-- Shipments (shipping-service)
CREATE TABLE IF NOT EXISTS "shipments" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'dispatched',
    "carrier" TEXT,
    "tracking_number" TEXT,
    "dispatched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_shipments_order_id" ON "shipments" ("order_id");

-- Cart items (cart-recommendation-service)
CREATE TABLE IF NOT EXISTS "cart_items" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE ("user_id", "sku")
);
CREATE INDEX IF NOT EXISTS "idx_cart_items_user_id" ON "cart_items" ("user_id");

-- Notifications (notification-service)
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_notifications_order_id" ON "notifications" ("order_id");

-- Outbox + idempotency (every service)
CREATE TABLE IF NOT EXISTS "outbox" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_outbox_sent" ON "outbox" ("sent");
CREATE INDEX IF NOT EXISTS "idx_outbox_created_at" ON "outbox" ("created_at");

CREATE TABLE IF NOT EXISTS "processed_events" (
    "idempotency_key" UUID NOT NULL PRIMARY KEY,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
