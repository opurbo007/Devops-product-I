export interface BaseEvent {
  eventId: string;
  idempotencyKey: string;
  correlationId: string;
  orderId: string;
  timestamp: string;
}
