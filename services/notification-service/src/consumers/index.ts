import { pool } from "../db/pool.js";
import { consumer } from "../kafka/consumer.js";
import { CircuitBreaker } from "../circuitBreaker.js";

const breaker = new CircuitBreaker({
  failureThreshold: Number(process.env.CB_FAILURE_THRESHOLD ?? 3),
  timeoutMs: Number(process.env.CB_TIMEOUT_MS ?? 1_000),
  resetMs: Number(process.env.CB_RESET_MS ?? 10_000),
});

// Mock send: logs the notification, fails if env NOTIFICATION_FAIL is set.
// The circuit breaker wraps this so repeated failures fast-fail after threshold.
async function mockSend(
  orderId: string,
  channel: string,
  template: string,
): Promise<void> {
  if (process.env.NOTIFICATION_FAIL === "1") {
    throw new Error(`mock send failure on channel ${channel}`);
  }
  console.log(
    `[email/SMS] orderId=${orderId} channel=${channel} template=${template}`,
  );
}

function templateFor(eventType: string): string {
  switch (eventType) {
    case "order.created":
      return "order_confirmation";
    case "payment.failed":
      return "payment_failure";
    case "shipping.dispatched":
      return "shipping_update";
    default:
      return "generic";
  }
}

const TOPICS = ["order.created", "payment.failed", "shipping.dispatched"] as const;

export async function processEvent(
  idempotencyKey: string,
  topic: string,
  event: Record<string, unknown>,
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
      console.log(`[skip] already processed ${topic} key=${idempotencyKey}`);
      return;
    }

    const orderId = (event.orderId ?? "") as string;
    const template = templateFor(topic);
    const channel = "email";

    try {
      await breaker.execute(() => mockSend(orderId, channel, template));
    } catch (e) {
      console.error(
        `[notification] circuit breaker or send failed for ${topic}`,
        e instanceof Error ? e.message : e,
      );
    }

    await client.query(
      "INSERT INTO notifications (order_id, channel, template, payload) VALUES ($1, $2, $3, $4)",
      [orderId, channel, template, JSON.stringify(event)],
    );
    await client.query(
      "INSERT INTO processed_events (idempotency_key) VALUES ($1)",
      [idempotencyKey],
    );
    await client.query("COMMIT");
    console.log(`[notified] orderId=${orderId} template=${template}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topics: [...TOPICS], fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const idempotencyKey = message.key?.toString() ?? "";
      const value = JSON.parse(message.value?.toString() ?? "{}");
      console.log(`[in] ${topic} key=${idempotencyKey}`);
      try {
        await processEvent(idempotencyKey, topic, value);
      } catch (e) {
        console.error(`[error] processing ${topic}`, e);
      }
    },
  });
  console.log("notification consumer running");
}