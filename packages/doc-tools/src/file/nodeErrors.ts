/**
 * Whether an error is a Node system error carrying the given code.
 *
 * @param value Anything caught; a non-Error answers false
 * @param code The `code` to match, e.g. `"ENOENT"`
 */
export const isErrnoWithCode = (
	value: unknown,
	code: string,
): value is NodeJS.ErrnoException =>
	value instanceof Error && (value as NodeJS.ErrnoException).code === code;
