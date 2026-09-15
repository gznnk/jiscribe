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
 * mounted and {@link DocEditingPausedOverlay} reports the error over it instead.
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
 * Layer that covers the canvas while the editor's text is broken, keeping the
 * last valid canvas visible behind it (#136) but out of reach.
 *
 * It swallows every pointer event rather than letting them through: a commit
 * from the canvas replaces the whole document, so one gesture here would
 * overwrite the text the user is in the middle of repairing. The notice sits
 * bottom-left — the toolbar owns the top edge and the canvas's own error toast
 * the bottom-right — and says the editing is paused, so the block does not read
 * as the canvas having frozen.
 *
 * @param error What is wrong with the text currently in the editor.
 */
export function DocEditingPausedOverlay({ error }: { error: DocViewError }) {
	const { title, detail } = describeDocViewError(error);
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				cursor: "not-allowed",
				zIndex: 10,
			}}
		>
			<div
				style={{
					position: "absolute",
					bottom: "8px",
					left: "8px",
					maxWidth: "min(420px, calc(100% - 16px))",
					padding: "6px 10px",
					borderRadius: "4px",
					border:
						"1px solid var(--vscode-inputValidation-errorBorder, #dc2626)",
					backgroundColor:
						"var(--vscode-inputValidation-errorBackground, #5a1d1d)",
					color: "var(--vscode-foreground, #cccccc)",
					fontFamily: "sans-serif",
					fontSize: "11px",
					lineHeight: 1.5,
				}}
			>
				<div style={{ fontWeight: "bold" }}>{title}</div>
				<div style={{ wordBreak: "break-word" }}>{detail}</div>
				<div style={{ opacity: 0.8 }}>
					Editing is paused; the last valid canvas stays on screen until the
					text parses again.
				</div>
			</div>
		</div>
	);
}
