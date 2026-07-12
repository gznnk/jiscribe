import * as vscode from "vscode";

/**
 * Canvas エディタの Webview に表示する HTML を生成する。
 * `.jis.json`（テキスト）と `.jis.png`（バイナリ）の両カスタムエディタで共有する。
 *
 * セキュリティのため Content-Security-Policy（CSP）を設定し、
 * 許可されたスクリプト以外の実行をブロックする。
 * nonce（使い捨てランダム文字列）を使って正規のスクリプトのみを識別する。
 */
export const getCanvasWebviewHtml = (
	webview: vscode.Webview,
	extensionUri: vscode.Uri,
): string => {
	// dist/webview.js の VSCode Webview 内でアクセス可能な URI を取得する。
	// Webview 内では通常のファイルパスではなくこの URI 形式を使う必要がある。
	const scriptUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, "dist", "webview.js"),
	);

	const nonce = getNonce();

	return /* html */ `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<!--
				Content-Security-Policy の説明:
				  default-src 'none'        → 何も許可しない（ホワイトリスト方式）
				  img-src ...               → 画像の読み込み元を許可（blob: は PNG 書き出しの
				                              SVG→<img> ラスタライズ工程で必要）
				  style-src ... 'unsafe-inline' → インラインスタイルを許可
				  font-src ...              → フォントの読み込み元を許可
				  script-src 'nonce-...'   → nonce が一致するスクリプトのみ実行を許可
				この設定により XSS 攻撃のリスクを低減する。
			-->
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data: blob:; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
			<title>Jiscribe Canvas Editor</title>
			<style>
				body, html {
					margin: 0;
					padding: 0;
					width: 100%;
					height: 100vh;
					overflow: hidden;
				}
				#root {
					width: 100%;
					height: 100%;
				}
			</style>
		</head>
		<body>
			<div id="root"></div>
			<!--
				script タグを body 末尾に置く理由:
				DOM 構築後にスクリプトが実行されることを保証するため。
				これにより document.getElementById("root") が必ず要素を見つけられる。
			-->
			<script nonce="${nonce}" src="${scriptUri}"></script>
		</body>
		</html>
	`;
};

/**
 * Content-Security-Policy 用の nonce（使い捨てランダム文字列）を生成する。
 * 32文字の英数字ランダム文字列を返す。
 */
function getNonce(): string {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	return Array.from(
		{ length: 32 },
		() => chars[Math.floor(Math.random() * chars.length)],
	).join("");
}
