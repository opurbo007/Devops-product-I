import { startConsumers } from "./consumers/index.js";
import { publishOutboxEvents } from "./outbox/publisher.js";

// Worker-mode entrypoint: Kafka consumers + outbox relay without the HTTP
// server (see index.ts for the full boot including the HTTP API).
let running = true;
process.on("SIGINT", () => (running = false));
process.on("SIGTERM", () => (running = false));

await startConsumers();

const INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 2_000);
console.log(`outbox publisher polling every ${INTERVAL_MS}ms`);

while (running) {
  try {
    const n = await publishOutboxEvents();
    if (n > 0) console.log(`published ${n} event(s)`);
  } catch (e) {
    console.error("outbox publisher error:", e);
  }
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}

process.exit(0);
