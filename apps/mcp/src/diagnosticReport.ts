import type { Diagnostic } from "@jiscribe/doc-tools";

/**
 * Format a doc-tools diagnostic list into the text returned to the AI.
 *
 * With none at all, a single `valid: true` line. Otherwise the count followed by
 * one line per diagnostic, with `valid: false` as soon as one of them is an error
 * (warnings alone leave it true). The location uses id then path, and a
 * whole-document finding that has neither is filled in with `-`.
 */
export function formatDiagnostics(diagnostics: readonly Diagnostic[]): string {
	const hasError = diagnostics.some(
		(diagnostic) => diagnostic.severity === "error",
	);
	if (diagnostics.length === 0) {
		return "valid: true";
	}
	const lines = diagnostics.map(
		(diagnostic) =>
			`- ${diagnostic.severity} ${diagnostic.objectId ?? diagnostic.path ?? "-"}: ${diagnostic.message}`,
	);
	return `valid: ${!hasError}\n${diagnostics.length} issue(s):\n${lines.join("\n")}`;
}
