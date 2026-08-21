import type { Diagnostic } from "@jiscribe/doc-tools";

/**
 * One diagnostic as one line: `<severity> <file> <objectId> <message>`, the
 * fields separated by single spaces and never reordered, so `grep` and `cut`
 * read it as readily as a person does. An object the finding does not name is
 * written as `-` rather than left out, which keeps the message in the same
 * column on every line.
 *
 * @param file - Path of the file the finding is about, printed as the caller gave it
 * @param diagnostic - The finding; its message is printed verbatim and may contain spaces, being the last field
 * @returns The line, with no trailing newline
 */
export const formatDiagnosticLine = (
	file: string,
	diagnostic: Diagnostic,
): string =>
	`${diagnostic.severity} ${file} ${diagnostic.objectId ?? diagnostic.path ?? "-"} ${diagnostic.message}`;

/** Whether a run should exit non-zero: any error, warnings alone being fine. */
export const hasError = (diagnostics: readonly Diagnostic[]): boolean =>
	diagnostics.some((diagnostic) => diagnostic.severity === "error");
