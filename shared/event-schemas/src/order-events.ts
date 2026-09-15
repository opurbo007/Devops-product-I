import type { BaseEvent } from "./base-event";

export interface OrderCreatedItem {
  sku: string;
  qty: number;
  priceMinor: number;
}

export interface OrderCreatedEvent extends BaseEvent {
  type: "order.created";
  payload: {
    customerId: string;
    currency: string;
    totalMinor: number;
    items: OrderCreatedItem[];
    channel: string;
  };
}
