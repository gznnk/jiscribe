/**
 * A single semantic validation diagnostic: a JSON path, a human-readable message,
 * and an optional flag marking rules the JSON schema cannot detect.
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
};
