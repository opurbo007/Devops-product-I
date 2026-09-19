import { prisma } from "../db/prisma.js";
import { consumer } from "../kafka/consumer.js";
import { producer, connectProducer } from "../kafka/producer.js";
import { withDlq } from "shared-platform";
import { createPaymentCircuitBreaker } from "../circuitBreaker.js";
import {
  getPaymentProvider,
  ProviderDeclinedError,
} from "../providers/index.js";
import type { ChargeResult } from "../providers/index.js";

const breaker = createPaymentCircuitBreaker();

// Ops introspection for the chaos playground (GET /admin/circuit).
export function getCircuitStats() {
  return breaker.getStats();
}

export interface InventoryReservedPayload {
  orderId: string;
  /** Order total as decimal string (forwarded by inventory-service). */
  total?: unknown;
  /** Explicit minor-units amount (takes precedence over total). */
  amountMinor?: unknown;
  currency?: unknown;
}

// Resolve what to charge: explicit amountMinor > forwarded order total >
// PAYMENT_DEFAULT_AMOUNT_MINOR fallback (demo default $19.99).
export function resolveChargeAmount(event: InventoryReservedPayload): {
  amountMinor: number;
  currency: string;
} {
  const currency =
    typeof event.currency === "string" && event.currency.length > 0
      ? event.currency.toUpperCase()
      : (process.env.PAYMENT_DEFAULT_CURRENCY ?? "USD").toUpperCase();

  if (
    typeof event.amountMinor === "number" &&
    Number.isInteger(event.amountMinor) &&
    event.amountMinor > 0
  ) {
    return { amountMinor: event.amountMinor, currency };
  }
  const total =
    typeof event.total === "string" || typeof event.total === "number"
      ? Number(event.total)
      : NaN;
  if (Number.isFinite(total) && total > 0) {
    return { amountMinor: Math.round(total * 100), currency };
  }
  const fallback = Number(process.env.PAYMENT_DEFAULT_AMOUNT_MINOR ?? 1999);
  return {
    amountMinor:
      Number.isInteger(fallback) && fallback > 0 ? fallback : 1999,
    currency,
  };
}

export async function processInventoryReserved(
  idempotencyKey: string,
  event: InventoryReservedPayload,
): Promise<void> {
  const provider = getPaymentProvider();
  const { amountMinor, currency } = resolveChargeAmount(event);

  await prisma.$transaction(async (tx) => {
    const dup = await tx.processedEvent.findUnique({
      where: { idempotencyKey },
    });
    if (dup) {
      console.log(`[skip] already processed reservation for order ${event.orderId}`);
      return;
    }

    let charge: ChargeResult;
    try {
      charge = await breaker.execute(() =>
        provider.charge({ orderId: event.orderId, amountMinor, currency, idempotencyKey }),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "payment failed";
      const declineCode =
        e instanceof ProviderDeclinedError
          ? e.code
          : message.includes("circuit")
            ? "CIRCUIT_OPEN"
            : "DECLINED";

      await tx.payment.create({
        data: {
          orderId: event.orderId,
          status: "failed",
          amountMinor,
          currency,
          providerReference: null,
        },
      });
      await tx.outbox.create({
        data: {
          topic: "payment.failed",
          payload: {
            orderId: event.orderId,
            amountMinor,
            currency,
            reason: message,
            code: declineCode,
            attempt: 1,
          },
        },
      });
      await tx.processedEvent.create({ data: { idempotencyKey } });
      console.log(`[payment.failed] order ${event.orderId}: ${message}`);
      return;
    }

    await tx.payment.create({
      data: {
        orderId: event.orderId,
        status: "completed",
        amountMinor: charge.amountMinor,
        currency: charge.currency,
        providerReference: charge.providerReference,
      },
    });
    await tx.outbox.create({
      data: {
        topic: "payment.completed",
        payload: {
          orderId: event.orderId,
          amountMinor: charge.amountMinor,
          currency: charge.currency,
          provider: provider.name,
          providerReference: charge.providerReference,
          capturedAt: charge.capturedAt,
        },
      },
    });
    await tx.processedEvent.create({ data: { idempotencyKey } });
    console.log(
      `[payment.completed] order ${event.orderId} via ${provider.name} (${charge.providerReference})`,
    );
  });
}

export async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: "inventory.reserved", fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const idempotencyKey = message.key?.toString() ?? "";
      const value = JSON.parse(message.value?.toString() ?? "{}");
      console.log(`[in] inventory.reserved key=${idempotencyKey}`);
      await withDlq(
        producer,
        connectProducer,
        "payment-service",
        "inventory.reserved",
        idempotencyKey,
        value,
        () => processInventoryReserved(idempotencyKey, value),
      );
    },
  });
  console.log("payment consumer running");
}
