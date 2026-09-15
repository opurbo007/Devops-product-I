CREATE TABLE IF NOT EXISTS stock (
    sku TEXT PRIMARY KEY,
    available_quantity INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0)
);

CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_reservations_order_id ON reservations (order_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);