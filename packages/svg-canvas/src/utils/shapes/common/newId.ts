/**
 * Generates a new unique identifier.
 *
 * @returns A newly generated UUID
 */
export const newId = (): string => crypto.randomUUID();
