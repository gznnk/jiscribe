/**
 * Render a caught value as the tail of a user-facing message.
 *
 * @param error - the caught value; anything that is not an Error carries no
 *   message worth showing and yields an empty string rather than being
 *   stringified
 * @returns `": "` followed by the error's message, or an empty string, so the
 *   caller can append it unconditionally
 */
export function describeErrorDetail(error: unknown): string {
	return error instanceof Error ? `: ${error.message}` : "";
}
