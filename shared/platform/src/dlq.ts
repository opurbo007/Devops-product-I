import "dotenv/config";
import {
  Kafka,
  type Consumer,
  type Producer,
} from "kafkajs";

// Dead-letter queue handling. Consumers run with auto-commit: a poison or
// transiently-failing message must never stall its partition, so handler
// errors are forwarded to `<topic>.DLQ` (original key/value preserved, failure
// context in headers) and the offset commits. Ops replays DLQ messages back
// to their original topic via the /admin/dlq endpoints; downstream
// idempotency keys make replay safe.

export function kafkaBrokers(): string[] {
  return (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
}

export const dlqTopicFor = (topic: string): string => `${topic}.DLQ`;

export interface DlqMessage {
  dlqTopic: string;
  originalTopic: string;
  key: string;
  value: unknown;
  source: string;
  error: string;
  failedAt: string;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function headerText(
  headers: Record<string, unknown> | undefined,
  name: string,
): string {
  const v = headers?.[name];
  if (typeof v === "string") return v;
  if (v instanceof Buffer) return v.toString();
  if (v instanceof Uint8Array) return Buffer.from(v).toString();
  return "";
}

// Wrap a topic handler: on throw, publish the message to <topic>.DLQ.
// ensureProducer lazily connects the service producer on first DLQ write.
export async function withDlq(
  producer: Producer,
  ensureProducer: () => Promise<void>,
  source: string,
  topic: string,
  key: string,
  value: unknown,
  handle: () => Promise<void>,
): Promise<void> {
  try {
    await handle();
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[error] processing ${topic} — sending to DLQ`, error);
    await ensureProducer();
    await producer.send({
      topic: dlqTopicFor(topic),
      messages: [
        {
          key,
          value: JSON.stringify(value),
          headers: {
            "dlq-source": source,
            "dlq-topic": topic,
            "dlq-error": error.slice(0, 1024),
            "dlq-failed-at": new Date().toISOString(),
          },
        },
      ],
    });
    console.log(`[dlq] ${topic} key=${key} -> ${dlqTopicFor(topic)}`);
  }
}

// Peek at DLQ topics with an ephemeral consumer group (from beginning, no
// commits) — backs GET /admin/dlq.
export async function peekDlq(options: {
  clientId: string;
  topics: string[];
  limit?: number;
}): Promise<DlqMessage[]> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const kafka = new Kafka({
    clientId: `${options.clientId}-dlq-peek`,
    brokers: kafkaBrokers(),
  });
  const consumer: Consumer = kafka.consumer({
    groupId: `dlq-peek-${crypto.randomUUID()}`,
  });
  const out: DlqMessage[] = [];
  try {
    await consumer.connect();
    await consumer.subscribe({ topics: options.topics, fromBeginning: true });
    await consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, message }) => {
        const headers = message.headers as Record<string, unknown> | undefined;
        out.push({
          dlqTopic: topic,
          originalTopic: headerText(headers, "dlq-topic") || topic.replace(/\.DLQ$/, ""),
          key: message.key?.toString() ?? "",
          value: parseJson(message.value?.toString() ?? "{}"),
          source: headerText(headers, "dlq-source"),
          error: headerText(headers, "dlq-error"),
          failedAt: headerText(headers, "dlq-failed-at"),
        });
        if (out.length >= limit) {
          await consumer.stop();
        }
      },
    });
  } finally {
    await consumer.disconnect().catch(() => undefined);
  }
  return out;
}

// Replay DLQ messages back to their original topics (backs
// POST /admin/dlq/replay). Reads from the beginning with an ephemeral group;
// each replayed message keeps its original key/value so downstream
// idempotency keys dedupe naturally. Returns the replayed count.
export async function replayDlq(
  producer: Producer,
  ensureProducer: () => Promise<void>,
  options: { clientId: string; dlqTopic: string; limit?: number },
): Promise<number> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 1000);
  await ensureProducer();
  const kafka = new Kafka({
    clientId: `${options.clientId}-dlq-replay`,
    brokers: kafkaBrokers(),
  });
  const consumer: Consumer = kafka.consumer({
    groupId: `dlq-replay-${crypto.randomUUID()}`,
  });
  let count = 0;
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: options.dlqTopic, fromBeginning: true });
    await consumer.run({
      autoCommit: false,
      eachMessage: async ({ message }) => {
        if (count >= limit) {
          await consumer.stop();
          return;
        }
        const headers = message.headers as Record<string, unknown> | undefined;
        const originalTopic =
          headerText(headers, "dlq-topic") ||
          options.dlqTopic.replace(/\.DLQ$/, "");
        await producer.send({
          topic: originalTopic,
          messages: [
            {
              key: message.key?.toString() ?? "",
              value: message.value?.toString() ?? "{}",
              headers: { "dlq-replay": "1" },
            },
          ],
        });
        count++;
      },
    });
  } finally {
    await consumer.disconnect().catch(() => undefined);
  }
  console.log(`[dlq-replay] ${count} message(s) ${options.dlqTopic} -> original topics`);
  return count;
}
