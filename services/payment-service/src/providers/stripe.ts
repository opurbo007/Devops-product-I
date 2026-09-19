import Stripe from "stripe";
import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  RefundResult,
} from "./types.js";
import { ProviderDeclinedError } from "./types.js";

// Real Stripe provider (PaymentIntents, confirmed server-side).
// Requires PAYMENT_PROVIDER=stripe + STRIPE_SECRET_KEY. Uses a test payment
// method (STRIPE_TEST_PAYMENT_METHOD, default pm_card_visa) since this system
// has no card-collection frontend; swap in a saved customer payment method
// for production. The Kafka idempotency key is forwarded as Stripe's
// idempotency key so redelivered events never double-charge.
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private readonly stripe: Stripe;

  constructor(secretKey = process.env.STRIPE_SECRET_KEY) {
    if (!secretKey) {
      throw new Error("PAYMENT_PROVIDER=stripe requires STRIPE_SECRET_KEY");
    }
    this.stripe = new Stripe(secretKey);
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    let intent: Stripe.PaymentIntent;
    try {
      intent = await this.stripe.paymentIntents.create(
        {
          amount: input.amountMinor,
          currency: input.currency.toLowerCase(),
          payment_method:
            process.env.STRIPE_TEST_PAYMENT_METHOD ?? "pm_card_visa",
          confirm: true,
          off_session: true,
          description: `Order ${input.orderId}`,
          metadata: { orderId: input.orderId },
        },
        { idempotencyKey: `charge-${input.idempotencyKey}` },
      );
    } catch (e) {
      throw toProviderError(e);
    }

    if (intent.status === "succeeded") {
      return {
        providerReference: intent.id,
        amountMinor: intent.amount,
        currency: intent.currency.toUpperCase(),
        capturedAt: new Date(intent.created * 1000).toISOString(),
      };
    }
    throw new ProviderDeclinedError(
      `stripe payment ${intent.status}`,
      statusToCode(intent.status),
    );
  }

  async refund(
    orderId: string,
    providerReference: string | null,
    amountMinor?: number,
  ): Promise<RefundResult> {
    if (!providerReference) {
      throw new Error(`no provider reference for order ${orderId}`);
    }
    const refund = await this.stripe.refunds.create({
      payment_intent: providerReference,
      ...(amountMinor !== undefined ? { amount: amountMinor } : {}),
      metadata: { orderId },
    });
    return {
      refundReference: refund.id,
      amountMinor: refund.amount,
      refundedAt: new Date().toISOString(),
    };
  }
}

function statusToCode(status: Stripe.PaymentIntent.Status): string {
  switch (status) {
    case "requires_payment_method":
    case "requires_confirmation":
      return "card_declined";
    case "requires_action":
      return "authentication_required";
    case "canceled":
      return "canceled";
    default:
      return "DECLINED";
  }
}

// Stripe SDK errors carry `type`/`code` (duck-typed here to avoid coupling to
// SDK internals): card errors are business declines, everything else (rate
// limits, connection, auth) is transient and should trip the breaker.
function toProviderError(e: unknown): Error {
  if (e instanceof ProviderDeclinedError) return e;
  if (e && typeof e === "object") {
    const se = e as { type?: string; code?: string; message?: string };
    if (se.type === "StripeCardError") {
      return new ProviderDeclinedError(
        `stripe declined: ${se.message ?? "card error"}`,
        se.code ?? "card_declined",
      );
    }
    if (typeof se.message === "string" && se.message) {
      const err = new Error(`stripe error: ${se.message}`);
      (err as { code?: string }).code = se.code ?? se.type ?? "stripe_error";
      return err;
    }
  }
  return e instanceof Error ? e : new Error("stripe charge failed");
}
