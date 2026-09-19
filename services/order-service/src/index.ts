import dotenv from "dotenv";
import { createApp } from "./server.js";
import { startConsumers } from "./consumers/index.js";
import { publishOutboxEvents } from "./outbox/publisher.js";

dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const app = createApp();
app.listen(port, () => {
  console.log(`order-service listening on port ${port}`);
});

let running = true;
process.on("SIGINT", () => (running = false));
process.on("SIGTERM", () => (running = false));

const INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 2_000);

await startConsumers();

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
