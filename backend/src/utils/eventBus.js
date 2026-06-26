import { EventEmitter } from 'events';

// Export a singleton instance of the event emitter
export const eventBus = new EventEmitter();

// Define standard domain events
export const DomainEvents = {
  INVOICE_FINALIZED: 'invoice.finalized',
  PAYMENT_RECEIVED: 'payment.received'
};
