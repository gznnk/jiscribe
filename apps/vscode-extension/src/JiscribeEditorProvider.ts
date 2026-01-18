import * as vscode from "vscode";

export class JiscribeEditorProvider
	implements vscode.CustomTextEditorProvider
{
	constructor(private readonly context: vscode.ExtensionContext) {}

	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		// Setup initial webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};

		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

		// Flag to track if update is coming from webview
		let isUpdatingFromWebview = false;

		// Update webview content when document changes
		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
			(e) => {
				if (e.document.uri.toString() === document.uri.toString()) {
					// Don't update webview if the change came from the webview itself
					if (!isUpdatingFromWebview) {
						this.updateWebview(webviewPanel, document);
					}
				}
			}
		);

		// Make sure we dispose the listener when the panel is closed
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		// Handle messages from the webview
		webviewPanel.webview.onDidReceiveMessage((message) => {
			switch (message.type) {
				case "ready":
					// Webview is ready, send initial data
					console.log("Webview ready, sending initial data");
					this.updateWebview(webviewPanel, document);
					break;
				case "update":
					// Set flag before updating document
					isUpdatingFromWebview = true;
					this.updateTextDocument(document, message.data).then(() => {
						// Reset flag after update is complete
						isUpdatingFromWebview = false;
					});
					break;
			}
		});
	}

	private updateWebview(
		panel: vscode.WebviewPanel,
		document: vscode.TextDocument
	) {
		const data = document.getText();
		console.log("Sending data to webview:", data.substring(0, 100));
		panel.webview.postMessage({
			type: "update",
			data,
		});
		console.log("Message posted to webview");
	}

	private updateTextDocument(document: vscode.TextDocument, json: string) {
		const edit = new vscode.WorkspaceEdit();

		// Replace the entire document
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			json
		);

		return vscode.workspace.applyEdit(edit);
	}

	private getHtmlForWebview(webview: vscode.Webview): string {
		// Get the local path to main script run in the webview
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js")
		);

		// Use a nonce to only allow a specific script to be run
		const nonce = getNonce();

		return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
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
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>
		`;
	}
}

function getNonce() {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
