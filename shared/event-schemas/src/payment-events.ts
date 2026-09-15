import type { BaseEvent } from "./base-event";

export interface PaymentCompletedEvent extends BaseEvent {
  type: "payment.completed";
  payload: {
    amountMinor: number;
    currency: string;
    provider: string;
    providerReference: string;
    capturedAt: string;
  };
}

export interface PaymentFailedEvent extends BaseEvent {
  type: "payment.failed";
  payload: {
    amountMinor: number;
    currency: string;
    code: string;
    declineCode: string;
    attempt: number;
  };
}
