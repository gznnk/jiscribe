/** Small helper that reads a numeric field from overrides, returning the fallback if it is not a finite number. */
export const numberOverride = (value: unknown, fallback: number): number =>
	Number.isFinite(value) ? (value as number) : fallback;
