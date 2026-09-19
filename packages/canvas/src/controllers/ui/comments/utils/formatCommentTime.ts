/**
 * Renders a comment's timestamp for display.
 *
 * @param isoTimestamp - The comment's `createdAt` / `editedAt`, ISO 8601 as the poster wrote it
 * @param locale - BCP 47 tag from `useCanvasLocale`, handed straight to `Intl.DateTimeFormat`
 * @returns Date and time in the locale's medium/short forms, or `isoTimestamp`
 *   unchanged when it does not parse as a date (a hand-edited file can hold anything)
 */
export const formatCommentTime = (
	isoTimestamp: string,
	locale: string,
): string => {
	const date = new Date(isoTimestamp);
	if (Number.isNaN(date.getTime())) {
		return isoTimestamp;
	}
	return new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
};
