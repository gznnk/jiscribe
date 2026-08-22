/** How much a diagnostic matters: an `error` makes the check fail, a `warning` does not. */
export type DiagnosticSeverity = "error" | "warning";

/**
 * One finding about a document, from validation or from diagnosis. The single
 * shape every tool in this package reports in, so a caller formats one list
 * however many checks produced it.
 */
export type Diagnostic = {
	/** Whether this fails the check (`error`) or only reports (`warning`). */
	severity: DiagnosticSeverity;
	/** Id of the object the finding is about; absent for a document-wide one. */
	objectId?: string;
	/** JSON path into the document (`/root/3/width`), where the finding has one. */
	path?: string;
	/** One line, in English, naming what is wrong and the numbers behind it. */
	message: string;
};
