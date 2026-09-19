import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  RefundResult,
} from "./types.js";
import { ProviderDeclinedError } from "./types.js";

// In-memory provider for local dev, tests, and demos. Failures are forced
// via env (same as before):
//   PAYMENT_DECLINE_CODE=card_declined -> always decline (failure path)
//   PAYMENT_LATENCY_MS=5000            -> slow call (triggers circuit timeout)
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const decline = process.env.PAYMENT_DECLINE_CODE;
    if (decline) {
      throw new ProviderDeclinedError(`provider declined: ${decline}`, decline);
    }
    const latency = Number(process.env.PAYMENT_LATENCY_MS ?? 0);
    if (latency > 0) {
      await new Promise((r) => setTimeout(r, latency));
    }
    return {
      providerReference: `MOCK-${crypto.randomUUID()}`,
      amountMinor: input.amountMinor,
      currency: input.currency,
      capturedAt: new Date().toISOString(),
    };
  }

  async refund(
    _orderId: string,
    _providerReference: string | null,
    amountMinor = 0,
  ): Promise<RefundResult> {
    return {
      refundReference: `RFND-${crypto.randomUUID()}`,
      amountMinor,
      refundedAt: new Date().toISOString(),
    };
  }
}
