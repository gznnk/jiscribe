/**
 * Webview component that just states the CanvasDoc has validation errors.
 *
 * Individual error details (path / message / line range) are surfaced in
 * VSCode's Problems panel by DiagnosticProvider, so here we don't repeat the
 * list — only the fact that errors exist and the next action.
 */
export function CanvasErrorNotice() {
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
				fontFamily: "sans-serif",
				padding: "20px",
				boxSizing: "border-box",
				textAlign: "center",
			}}
		>
			<div style={{ fontWeight: "bold", marginBottom: "8px" }}>
				⚠️ This canvas has validation errors
			</div>
			<div style={{ fontSize: "12px", color: "#6b7280" }}>
				Check the Problems panel or fix the JSON directly in the editor.
			</div>
		</div>
	);
}
