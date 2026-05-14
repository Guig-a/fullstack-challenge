export type EventEnvelope<TType extends string, TPayload> = {
  eventId: string;
  type: TType;
  schemaVersion: 1;
  occurredAt: string;
  payload: TPayload;
};
