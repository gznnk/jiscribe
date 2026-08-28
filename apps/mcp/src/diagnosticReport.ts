import type { Diagnostic } from "@jiscribe/doc-tools";

/**
 * doc-tools の診断一覧を AI へ返すテキストへ整形する。
 *
 * 1 件も無ければ `valid: true` の 1 行。あれば件数に続けて 1 行 1 件で並べ、
 * error が 1 件でもあれば `valid: false` にする（warning だけなら true のまま）。
 * 位置は id・path の順に使い、どちらも無い文書全体の指摘は `-` で埋める。
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
