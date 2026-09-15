import { pool } from "../db/pool.js";
import { consumer } from "../kafka/consumer.js";
import { createPaymentCircuitBreaker } from "../circuitBreaker.js";

interface ChargeResult {
  reference: string;
  capturedAt: string;
}

const breaker = createPaymentCircuitBreaker();

// Mock provider call. For the demo, failures are forced via env:
//   PAYMENT_DECLINE_CODE=DECLINED   -> always decline (test failure path)
//   PAYMENT_LATENCY_MS=5000          -> slow call (triggers circuit timeout)
async function mockCharge(orderId: string): Promise<ChargeResult> {
  const decline = process.env.PAYMENT_DECLINE_CODE;
  if (decline) {
    throw new Error(`provider declined: ${decline}`);
  }
  const latency = Number(process.env.PAYMENT_LATENCY_MS ?? 0);
  if (latency > 0) {
    await new Promise((r) => setTimeout(r, latency));
  }
  return {
    reference: `MOCK-${crypto.randomUUID()}`,
    capturedAt: new Date().toISOString(),
  };
}

export async function processInventoryReserved(
  idempotencyKey: string,
  event: { orderId: string },
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dup = await client.query(
      "SELECT 1 FROM processed_events WHERE idempotency_key = $1",
      [idempotencyKey],
    );
    if (dup.rows.length > 0) {
      await client.query("COMMIT");
      console.log(`[skip] already processed reservation for order ${event.orderId}`);
      return;
    }

    let charge: ChargeResult;
    try {
      charge = await breaker.execute(() => mockCharge(event.orderId));
    } catch (e) {
      const message = e instanceof Error ? e.message : "payment failed";
      const declineCode = message.includes("circuit") ? "CIRCUIT_OPEN" : "DECLINED";

      await client.query(
        "INSERT INTO payments (order_id, status, provider_reference) VALUES ($1, $2, $3)",
        [event.orderId, "failed", null],
      );
      await client.query(
        "INSERT INTO outbox (topic, payload) VALUES ($1, $2)",
        [
          "payment.failed",
          JSON.stringify({
            orderId: event.orderId,
            reason: message,
            code: declineCode,
            attempt: 1,
          }),
        ],
      );
      await client.query(
        "INSERT INTO processed_events (idempotency_key) VALUES ($1)",
        [idempotencyKey],
      );
      await client.query("COMMIT");
      console.log(`[payment.failed] order ${event.orderId}: ${message}`);
      return;
    }

    await client.query(
      "INSERT INTO payments (order_id, status, provider_reference) VALUES ($1, $2, $3)",
      [event.orderId, "completed", charge.reference],
    );
    await client.query(
      "INSERT INTO outbox (topic, payload) VALUES ($1, $2)",
      [
        "payment.completed",
        JSON.stringify({
          orderId: event.orderId,
          provider: "mock",
          providerReference: charge.reference,
          capturedAt: charge.capturedAt,
        }),
      ],
    );
    await client.query(
      "INSERT INTO processed_events (idempotency_key) VALUES ($1)",
      [idempotencyKey],
    );
    await client.query("COMMIT");
    console.log(`[payment.completed] order ${event.orderId}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: "inventory.reserved", fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const idempotencyKey = message.key?.toString() ?? "";
      const value = JSON.parse(message.value?.toString() ?? "{}");
      console.log(`[in] inventory.reserved key=${idempotencyKey}`);
      try {
        await processInventoryReserved(idempotencyKey, value);
      } catch (e) {
        console.error("[error] processing inventory.reserved", e);
      }
    },
  });
  console.log("payment consumer running");
}