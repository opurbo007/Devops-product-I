import type { BaseEvent } from "./base-event";

export interface InventoryReservedItem {
  sku: string;
  qty: number;
}

export interface InventoryReservedEvent extends BaseEvent {
  type: "inventory.reserved";
  payload: {
    items: InventoryReservedItem[];
    warehouse: string;
    ttlSeconds: number;
  };
}

export interface InventoryFailedEvent extends BaseEvent {
  type: "inventory.failed";
  payload: {
    reason: string;
    code: string;
    items: InventoryReservedItem[];
    warehouse: string;
  };
}
