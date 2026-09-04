import type { DocViewError } from "./docViewState";

/**
 * Headline and detail for an error, shared by the full-screen notice and the
 * overlay banner so both name the same failure the same way.
 */
const describeDocViewError = (
	error: DocViewError,
): { title: string; detail: string } =>
	error.kind === "parse"
		? { title: "JSON Parse Error", detail: error.message }
		: {
				title: "⚠️ This canvas has validation errors",
				detail:
					"Check the Problems panel or fix the JSON directly in the editor.",
			};

/**
 * Full-screen error display, shown only while no document has ever parsed clean
 * (a file that is already broken when opened). Once one has, the canvas stays
 * mounted and {@link DocErrorBanner} reports the error over it instead.
 *
 * @param error What is wrong with the text currently in the editor.
 */
export function DocErrorNotice({ error }: { error: DocViewError }) {
	const { title, detail } = describeDocViewError(error);
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				width: "100%",
				height: "100vh",
				color: "#dc2626",
				fontFamily: error.kind === "parse" ? "monospace" : "sans-serif",
				padding: "20px",
				boxSizing: "border-box",
				textAlign: "center",
			}}
		>
			<div style={{ fontWeight: "bold", marginBottom: "8px" }}>{title}</div>
			<div style={{ fontSize: "12px", color: "#6b7280" }}>{detail}</div>
		</div>
	);
}

/**
 * Overlay that reports the editor's text is broken while the last valid canvas
 * stays on screen behind it (#136).
 *
 * Sits bottom-left — the toolbar owns the top edge and the canvas's own error
 * toast the bottom-right — and takes no pointer events, so nothing underneath
 * becomes unreachable while an error stands.
 *
 * @param error What is wrong with the text currently in the editor.
 */
export function DocErrorBanner({ error }: { error: DocViewError }) {
	const { title, detail } = describeDocViewError(error);
	return (
		<div
			style={{
				position: "absolute",
				bottom: "8px",
				left: "8px",
				maxWidth: "min(420px, calc(100% - 16px))",
				padding: "6px 10px",
				borderRadius: "4px",
				border: "1px solid var(--vscode-inputValidation-errorBorder, #dc2626)",
				backgroundColor:
					"var(--vscode-inputValidation-errorBackground, #5a1d1d)",
				color: "var(--vscode-foreground, #cccccc)",
				fontFamily: "sans-serif",
				fontSize: "11px",
				lineHeight: 1.5,
				pointerEvents: "none",
				zIndex: 10,
			}}
		>
			<div style={{ fontWeight: "bold" }}>{title}</div>
			<div style={{ wordBreak: "break-word" }}>{detail}</div>
			<div style={{ opacity: 0.8 }}>
				Showing the last valid canvas until the text parses again.
			</div>
		</div>
	);
}
