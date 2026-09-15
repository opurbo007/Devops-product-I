import { Kafka, type Producer } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092")
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? "order-service",
  brokers,
});

const producer: Producer = kafka.producer();

let connecting: Promise<void> | null = null;
export async function connectProducer(): Promise<void> {
  if (!connecting) {
    connecting = producer.connect().finally(() => {
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