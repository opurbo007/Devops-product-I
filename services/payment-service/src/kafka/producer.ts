import { Kafka, type Producer } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? "payment-service",
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
});

const producer: Producer = kafka.producer();

let connecting: Promise<void> | null = null;
let connected = false;
// Idempotent: safe to call from the consumer DLQ path, the outbox relay,
// and startup in any order — the producer connects exactly once.
export async function connectProducer(): Promise<void> {
  if (connected) return;
  if (!connecting) {
    connecting = producer
      .connect()
      .then(() => {
        connected = true;
      })
      .finally(() => {
        connecting = null;
      });
  }
  return connecting;
}

export async function disconnectProducer(): Promise<void> {
  await connecting?.catch(() => undefined);
  await producer.disconnect();
}

export { kafka, producer };