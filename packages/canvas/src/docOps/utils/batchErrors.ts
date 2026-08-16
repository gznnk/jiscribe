import { DocOperationError } from "../errors";

/**
 * Wrap a failure from one element of a batch op, so the caller can tell which element
 * failed and know the doc was not touched. Every multi-element op in `docOps/ops`
 * formats its per-element failures through this, so the shape of the message is the
 * same regardless of which op threw.
 *
 * @param list - The batch op's own parameter name for the array being processed (e.g.
 *   `"objects"`, `"edits"`), read into the message verbatim
 * @param index - 0-based position of the failed element within `list`
 * @param subject - Word naming the element beyond its index: an id for one already in
 *   the doc, a type name for one not yet created. Omitted drops the `(...)` from the
 *   message rather than rendering an empty pair
 * @param cause - The lower-level failure; an `Error`'s `message` is used verbatim,
 *   anything else is passed through `String()`
 * @returns A {@link DocOperationError} reading
 *   `${list}[${index}] (${subject}): <reason> — the document was left unchanged`
 */
export const batchItemError = (
	list: string,
	index: number,
	subject: string | undefined,
	cause: unknown,
): DocOperationError => {
	const reason = cause instanceof Error ? cause.message : String(cause);
	const subjectSuffix = subject === undefined ? "" : ` (${subject})`;
	return new DocOperationError(
		`${list}[${index}]${subjectSuffix}: ${reason} — the document was left unchanged`,
	);
};
