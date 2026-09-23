-- Product catalog metadata owned by inventory-service (lightweight image handling).
-- Stock stays the quantity source of truth; products holds display fields incl. image URL.
-- image_url is either an external https:// URL or a local /images/<file> path
-- served by inventory-service and proxied publicly via the gateway.

CREATE TABLE IF NOT EXISTS "products" (
    "sku" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "image_url" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
