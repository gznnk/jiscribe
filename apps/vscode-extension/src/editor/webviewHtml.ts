import { randomBytes } from "node:crypto";

import * as vscode from "vscode";

/**
 * Build the HTML shown in the Canvas editor's Webview, shared by both the
 * `.jis` (text) and `.jis.png` (binary) custom editors.
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
	// The CSS imported by the webview bundle (the KaTeX styles), which esbuild emits as
	// dist/webview.css. Without it, math is typeset incorrectly.
	const styleUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, "dist", "webview.css"),
	);

	const nonce = getNonce();

	return /* html */ `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<!--
				default-src 'none' and only what the bundle needs. img-src carries no
				https: or data:, so a document cannot make the Webview fetch anything
				(a markdown image would otherwise leak that the file was opened, #28);
				doc images arrive as base64 over postMessage (resolveDocImage) and the
				PNG export rasterizes its SVG through a blob: URL, whose nested data:
				URIs are inline to the SVG rather than fetched by the page.
			-->
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
			<title>Jiscribe Canvas Editor</title>
			<link rel="stylesheet" href="${styleUri}">
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

/** A single-use CSP nonce from the CSPRNG (22 base64 characters of 128 bits). */
function getNonce(): string {
	return randomBytes(16).toString("base64url");
}
