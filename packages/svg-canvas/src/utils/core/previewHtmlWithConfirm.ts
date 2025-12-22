export const previewHtmlWithConfirm = (html: string) => {
	if (!window.confirm("このHTMLを表示しますか？")) return;

	// 1) Blob URL で開く（推奨）
	const blob = new Blob([html], { type: "text/html;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	window.open(url, "_blank");

	// メモリ解放（少し後で破棄）
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
