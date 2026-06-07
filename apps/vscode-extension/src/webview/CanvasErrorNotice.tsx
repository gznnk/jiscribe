/**
 * CanvasDoc の検証エラーがあることだけを簡潔に伝える Webview 用コンポーネント。
 *
 * 個々のエラー詳細（path / message / 行範囲）は DiagnosticProvider が
 * VSCode の Problems パネルへ出すため、ここでは一覧を再掲せず
 * 「エラーがある」という事実と次のアクションだけを示す。
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
