/** Fila BullMQ para desacoplar leitura do stream do processamento (worker dedicado). */
export const EVENT_BUS_DISPATCH_QUEUE = 'event-bus-dispatch';

export const EVENT_BUS_DISPATCH_JOB = 'dispatch-stream-message';

export type EventBusDispatchJobData = {
  stream: string;
  group: string;
  messageId: string;
  fields: string[];
};
