/**
 * Render a list of property or type names for a message, so every op naming names spells
 * them the same way.
 *
 * @param names - Rendered in the order given, which is the order the reader will act on;
 *   an empty list renders as the empty string rather than as a placeholder
 * @returns The names double-quoted and comma-separated, e.g. `"fill", "stroke"`
 */
export const quoteNames = (names: readonly string[]): string =>
	names.map((name) => `"${name}"`).join(", ");
