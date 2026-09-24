/**
 * A single semantic validation diagnostic: a JSON path, a human-readable message,
 * how severe it is, and optional flags marking rules the JSON schema cannot detect
 * and content the parser removes.
 */
export type SemanticDiagnostic = {
	path: string;
	message: string;
	id?: string;
	/**
	 * Indicates a validator-only structural rule that a JSON schema cannot detect.
	 * (Something the schema cannot faithfully express, or that is deliberately left out
	 * of the schema to avoid duplication.)
	 *
	 * Examples: cross-field invariants such as the connector's "both endpoints free
	 * forbidden" rule, or sanitization (allow-list) checks like `isCssSafeValue`.
	 *
	 * Consumers that delegate structural validation to a JSON schema (the VSCode
	 * extension's DiagnosticProvider) must display diagnostics with this flag set
	 * without suppressing them: the schema cannot detect them, so ignoring them would
	 * lead to a state where "the file won't open yet no error is shown".
	 * When omitted (undefined), the diagnostic is treated as a structural error that
	 * the schema can also detect.
	 */
	beyondSchema?: boolean;
	/**
	 * Absent means "error". A warning does not stop the document from loading:
	 * the parser carries it in `ok.warnings` instead of rejecting the document,
	 * so a caller that treats "any diagnostic" as a refusal has to filter with
	 * {@link isSemanticError} first.
	 */
	severity?: "error" | "warning";
	/**
	 * Set on an unknown-key warning: the segments from the validated object down
	 * to the key the parser removes from the document (`["zzUnknown"]` for a key
	 * sitting on the object itself, `["text", 0, "zz"]` for one inside a run).
	 * Structured rather than parsed back out of {@link path}, the key being any
	 * string a file may hold — `"a.b"` and `"x[0]"` included.
	 */
	unknownKeyPath?: readonly (string | number)[];
};

/**
 * The severity a diagnostic carries, an absent one being an error. The one place
 * the default is resolved, so every reader sees the same answer.
 *
 * @param diagnostic - Any diagnostic a validator returned
 */
export const severityOf = (
	diagnostic: SemanticDiagnostic,
): NonNullable<SemanticDiagnostic["severity"]> =>
	diagnostic.severity ?? "error";

/**
 * Whether a diagnostic is one that stops the document from loading, as opposed to
 * a warning about content that is dropped on save. The single question every
 * boundary that refuses on "any diagnostic" asks, so a warning reaching a list of
 * diagnostics cannot turn into a refusal somewhere that never looked at severity.
 *
 * @param diagnostic - Any diagnostic a validator returned; one with no `severity` is an error
 * @returns True for an error, false for a warning
 */
export const isSemanticError = (diagnostic: SemanticDiagnostic): boolean =>
	severityOf(diagnostic) === "error";

/**
 * Whether a diagnostic reports content the parser drops rather than a reason to
 * refuse the document; the complement of {@link isSemanticError}.
 *
 * @param diagnostic - Any diagnostic a validator returned
 */
export const isSemanticWarning = (diagnostic: SemanticDiagnostic): boolean =>
	severityOf(diagnostic) === "warning";
