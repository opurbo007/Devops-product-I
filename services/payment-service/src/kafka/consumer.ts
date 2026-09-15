import { Kafka, type Consumer } from "kafkajs";

export const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? "payment-service",
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
});

export const consumer: Consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID ?? "payment-service-group",
});