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

/**
 * A warning about the file as a whole, in the same four columns as a finding
 * from validation. Nothing in the document is at fault — a picture that could
 * not be read is the machine's doing, not the document's — so the object column
 * is the `-` of a document-wide diagnostic.
 *
 * @param file - Path of the file the warning is about, printed as the caller gave it
 * @param message - The warning itself, one line; printed verbatim as the last field, so it may contain spaces
 * @returns The line, with no trailing newline
 */
export const formatWarningLine = (file: string, message: string): string =>
	formatDiagnosticLine(file, { severity: "warning", message });

/** Whether a run should exit non-zero: any error, warnings alone being fine. */
export const hasError = (diagnostics: readonly Diagnostic[]): boolean =>
	diagnostics.some((diagnostic) => diagnostic.severity === "error");
