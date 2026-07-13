import * as vscode from "vscode";

/**
 * Build the HTML shown in the Canvas editor's Webview, shared by both the
 * `.jis.json` (text) and `.jis.png` (binary) custom editors.
 *
 * Sets a Content-Security-Policy that blocks all but the allowed script,
 * identified by a single-use random nonce.
 */
export const getCanvasWebviewHtml = (
	webview: vscode.Webview,
	extensionUri: vscode.Uri,
): string => {
	// Webview-accessible URI for dist/webview.js (a Webview needs this URI form,
	// not a plain file path).
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
				Content-Security-Policy (whitelist model, reduces XSS risk):
				  default-src 'none'            → allow nothing by default
				  img-src ...                   → allowed image sources (blob: is needed
				                                  for the SVG→<img> rasterize step of PNG export)
				  style-src ... 'unsafe-inline' → allow inline styles
				  font-src ...                  → allowed font sources
				  script-src 'nonce-...'        → run only scripts with the matching nonce
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
				Script goes at the end of body so it runs after the DOM is built,
				guaranteeing document.getElementById("root") finds the element.
			-->
			<script nonce="${nonce}" src="${scriptUri}"></script>
		</body>
		</html>
	`;
};

/** Generate a single-use 32-char alphanumeric nonce for the CSP. */
function getNonce(): string {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	return Array.from(
		{ length: 32 },
		() => chars[Math.floor(Math.random() * chars.length)],
	).join("");
}
