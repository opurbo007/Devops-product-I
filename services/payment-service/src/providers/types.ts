// Payment provider abstraction (Stripe-style). The saga consumer charges
// through this interface; the concrete provider is selected via
// PAYMENT_PROVIDER=mock|stripe so local dev/tests never need real keys.

export interface ChargeInput {
  orderId: string;
  amountMinor: number;
  currency: string;
  /** Kafka outbox id — forwarded as the provider idempotency key. */
  idempotencyKey: string;
}

export interface ChargeResult {
  /** Provider-side reference (Stripe PaymentIntent id, MOCK-uuid, ...). */
  providerReference: string;
  amountMinor: number;
  currency: string;
  capturedAt: string;
}

export interface RefundResult {
  refundReference: string;
  amountMinor: number;
  refundedAt: string;
}

// Business decline (card declined, auth required, ...): recorded as
// payment.failed with this code, does NOT trip the circuit breaker on its
// own beyond normal failure counting. Any other thrown Error is treated as
// transient/provider-unreachable.
export class ProviderDeclinedError extends Error {
  readonly code: string;

  constructor(message: string, code = "DECLINED") {
    super(message);
    this.name = "ProviderDeclinedError";
    this.code = code;
  }
}

export interface PaymentProvider {
  readonly name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(
    orderId: string,
    providerReference: string | null,
    amountMinor?: number,
  ): Promise<RefundResult>;
}
