/**
 * Type guard for a finite `number`. `NaN` and the infinities are rejected, so a narrowed
 * value can be compared, done arithmetic on, and written into a document without a second
 * check.
 *
 * The infinities are turned away rather than merely uncomfortable: JSON has no way to
 * spell one, so a value that reaches a document becomes `null` when it is saved and fails
 * to parse back — caught a save away for a host writing files, and never for one holding a
 * document in memory. Nothing a document holds (a coordinate, an extent, an angle, a
 * fraction) has an infinite value to mean.
 *
 * @param value - Value to narrow; numeric strings do not pass
 */
export const isNumber = (value: unknown): value is number => {
	return Number.isFinite(value);
};
