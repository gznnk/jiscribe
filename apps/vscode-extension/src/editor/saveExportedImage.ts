import * as vscode from "vscode";

/** `jiscribe-YYYYMMDD-HHmmss` 形式のフォールバックファイル名（拡張子なし）。 */
const buildTimestampedName = (): string => {
	const now = new Date();
	const pad = (value: number): string => String(value).padStart(2, "0");
	return (
		`jiscribe-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
		`-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
	);
};

/**
 * 編集中ドキュメントの URI からエクスポートのデフォルト保存先を導出する。
 *
 * - フォルダ: ドキュメントと同じフォルダ（untitled はワークスペースルート）
 * - ファイル名: ドキュメント名の拡張子（`.jis.json` 等の二重拡張子ごと）を
 *   エクスポート形式のものへ差し替える。untitled はタイムスタンプ名
 * - 派生名がドキュメント自身と一致する場合（`.jis.png` 編集中のソース埋め込み
 *   PNG エクスポート等）は `-export` を付けて自己上書きを防ぐ
 */
const buildDefaultUri = (
	documentUri: vscode.Uri,
	extension: string,
): vscode.Uri | undefined => {
	if (documentUri.scheme === "untitled") {
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
		return workspaceRoot
			? vscode.Uri.joinPath(
					workspaceRoot,
					`${buildTimestampedName()}${extension}`,
				)
			: undefined;
	}
	const documentFileName =
		documentUri.path.split("/").pop() ?? documentUri.path;
	// 対応パターンは *.jis.json / *.jiscribe.json / *.jis.svg / *.jis.png
	// （package.json の filenamePattern 参照）。.jiscribe.json の .jiscribe も
	// 残さず除去する（foo.jiscribe.json → foo.jis.png）
	const baseName = documentFileName.replace(
		/(\.jis|\.jiscribe)?\.(json|svg|png)$/i,
		"",
	);
	let exportFileName = `${baseName || buildTimestampedName()}${extension}`;
	if (exportFileName === documentFileName) {
		exportFileName = `${baseName}-export${extension}`;
	}
	return vscode.Uri.joinPath(documentUri, "..", exportFileName);
};

/**
 * エクスポートダイアログで生成された画像をワークスペースへ保存する
 * （Webview からの "exportImage" メッセージのハンドラ本体）。
 *
 * 保存ダイアログで保存先をユーザーに選ばせ（上書き確認は VSCode 標準）、
 * 成功時は Reveal アクション付きで通知する。キャンセル時は何もしない。
 * エラーは内部で通知まで済ませるため、この Promise は reject しない。
 */
export const saveExportedImage = async (
	documentUri: vscode.Uri,
	format: "png" | "svg",
	base64: string,
	includesSource: boolean,
): Promise<void> => {
	const extension = includesSource ? `.jis.${format}` : `.${format}`;
	const destination = await vscode.window.showSaveDialog({
		defaultUri: buildDefaultUri(documentUri, extension),
		filters:
			format === "png" ? { "PNG Image": ["png"] } : { "SVG Image": ["svg"] },
	});
	if (!destination) {
		return;
	}

	try {
		await vscode.workspace.fs.writeFile(
			destination,
			new Uint8Array(Buffer.from(base64, "base64")),
		);
	} catch (err) {
		console.error("[Jiscribe] Failed to save exported image:", err);
		const detail = err instanceof Error ? `: ${err.message}` : "";
		vscode.window.showErrorMessage(
			`Jiscribe: Failed to save exported image${detail}`,
		);
		return;
	}

	const savedFileName = destination.path.split("/").pop() ?? destination.path;
	const revealAction = "Reveal in Explorer";
	const selected = await vscode.window.showInformationMessage(
		`Jiscribe: Exported "${savedFileName}"`,
		revealAction,
	);
	if (selected === revealAction) {
		try {
			await vscode.commands.executeCommand("revealFileInOS", destination);
		} catch {
			// リモート環境等で OS のファイラーを開けない場合はエクスプローラービューで代替
			try {
				await vscode.commands.executeCommand("revealInExplorer", destination);
			} catch (err) {
				// ワークスペース外の保存先等では代替も失敗し得る。保存自体は成功
				// しているので、契約どおり reject せず通知に留める
				console.error("[Jiscribe] Failed to reveal exported image:", err);
				vscode.window.showWarningMessage(
					`Jiscribe: Could not reveal "${savedFileName}" in Explorer`,
				);
			}
		}
	}
};
