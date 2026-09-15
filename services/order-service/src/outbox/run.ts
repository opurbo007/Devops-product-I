import { publishOutboxEvents } from "./publisher.js";

const INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 2_000);

let running = true;

process.on("SIGINT", () => {
  running = false;
});
process.on("SIGTERM", () => {
  running = false;
});

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
