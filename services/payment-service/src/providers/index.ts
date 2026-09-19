import type { PaymentProvider } from "./types.js";
import { MockPaymentProvider } from "./mock.js";
import { StripePaymentProvider } from "./stripe.js";

export type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  RefundResult,
} from "./types.js";
export { ProviderDeclinedError } from "./types.js";

let cached: PaymentProvider | undefined;

// PAYMENT_PROVIDER=mock (default) needs no keys; =stripe requires
// STRIPE_SECRET_KEY and hits the real API.
export function getPaymentProvider(): PaymentProvider {
  if (!cached) {
    const kind = (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase();
    cached =
      kind === "stripe" ? new StripePaymentProvider() : new MockPaymentProvider();
    console.log(`payment provider: ${cached.name}`);
  }
  return cached;
}

// Test hook: drop the cached instance so env changes take effect.
export function resetPaymentProvider(): void {
  cached = undefined;
}
