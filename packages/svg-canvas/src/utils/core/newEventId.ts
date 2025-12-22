/**
 * Generate an event ID.
 *
 * @returns A unique event ID
 */
export const newEventId = (): string => crypto.randomUUID();
