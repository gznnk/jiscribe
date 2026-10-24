import type { Diagnostic } from "./Diagnostic";

/**
 * Format a diagnostic list into plain text, one finding per line, for a person or
 * an AI to read as it is.
 *
 * With none at all, a single `valid: true` line. Otherwise the count followed by
 * one line per diagnostic, with `valid: false` as soon as one of them is an error
 * (warnings alone leave it true). The location uses id then path, and a
 * whole-document finding that has neither is filled in with `-`.
 *
 * @param diagnostics What `validateDoc` or `diagnoseDoc` reported,
 *   printed in the order given; empty prints `valid: true` alone
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
