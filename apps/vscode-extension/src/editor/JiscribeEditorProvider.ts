import * as vscode from "vscode";

import { resolveCanvasWebview } from "./resolveCanvasWebview";
import { toWebviewDocSource } from "../canvasDocSource";
import type { ExtensionToWebviewMessage } from "../types/messages";

/**
 * Custom editor provider that shows the Canvas UI when a .jis.json file opens.
 *
 * Data flow:
 *   file change → Extension → Webview (postMessage)
 *   canvas edit → Webview → Extension (postMessage) → write back via WorkspaceEdit
 *
 * Image documents (.jis.svg / .jis.png) can't be handled by full-text
 * replacement, so JiscribeImageEditorProvider (re-render the image at save time)
 * covers them.
 */
export class JiscribeEditorProvider implements vscode.CustomTextEditorProvider {
	constructor(private readonly context: vscode.ExtensionContext) {}

	/**
	 * Called by VSCode each time a .jis.json file opens. Initializes the Webview
	 * and registers its event listeners.
	 *
	 * @param document  the opened file
	 * @param webviewPanel  the Webview panel hosting the UI
	 * @param _token  cancellation token (unused, required by the API)
	 */
	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken,
	): Promise<void> {
		// Count of in-flight applyEdit() calls from Webview edits. While > 0, the
		// resulting onDidChangeTextDocument events are our own write echoing back
		// and must not be re-sent to the Webview, or Webview → Extension → file
		// update → change event → re-send would loop forever. A counter (not a
		// boolean) tracks overlapping async updates precisely.
		let pendingWebviewUpdates = 0;

		// saveNonce from the Webview's latest "update", used to detect the
		// self-save echo. On onDidChangeTextDocument:
		//   - pendingWebviewUpdates > 0 (synchronous echo): consume and ignore.
		//   - pendingWebviewUpdates === 0 (async echo or external change): send it
		//     to the Webview with the nonce; the Canvas compares it to decide
		//     whether this is its own save echoing back.
		let lastSaveNonce: string | undefined;

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
			(e) => {
				if (e.document.uri.toString() !== document.uri.toString()) {
					return;
				}

				if (pendingWebviewUpdates > 0) {
					// Our own write is in flight → ignore, and consume the nonce so it
					// doesn't carry over to a later event.
					lastSaveNonce = undefined;
				} else {
					// External change or async echo → send with the nonce, then consume.
					this.updateWebview(webviewPanel, document, lastSaveNonce);
					lastSaveNonce = undefined;
				}
			},
		);

		resolveCanvasWebview(webviewPanel, {
			extensionUri: this.context.extensionUri,
			documentUri: document.uri,

			// Webview is initialized; send the initial file contents.
			onReady: () => this.updateWebview(webviewPanel, document),

			onUpdate: (data, saveNonce) => {
				// Write the canvas edit back to the file. Mark a Webview-origin
				// write as in flight; applyEdit() is async and
				// onDidChangeTextDocument may fire before it resolves, so a counter
				// tracks it. The two-arg .then(onFulfilled, onRejected) is used so an
				// exception thrown inside onFulfilled does not reach onRejected.
				lastSaveNonce = saveNonce;
				pendingWebviewUpdates++;
				this.updateTextDocument(document, data).then(
					(applied) => {
						pendingWebviewUpdates--;
						// applyEdit() can resolve false instead of rejecting (e.g. the
						// document is already closed); either way, notify the user it
						// wasn't saved.
						if (!applied) {
							this.notifySaveFailure(document, undefined);
						}
					},
					(err: unknown) => {
						// Always restore the counter on failure; otherwise it never
						// returns to 0 and all later external changes stop reaching the
						// Webview.
						pendingWebviewUpdates--;
						this.notifySaveFailure(document, err);
					},
				);
			},

			// The Webview's own listener is disposed by resolveCanvasWebview; this
			// one is ours and leaks without it.
			onDispose: () => changeDocumentSubscription.dispose(),
		});
	}

	/**
	 * Notify the user that a canvas edit could not be written back. A console
	 * error alone goes unnoticed and the user keeps editing as if saved, so
	 * always surface a visible error message.
	 */
	private notifySaveFailure(document: vscode.TextDocument, err: unknown) {
		console.error("[Jiscribe] Failed to write to file:", err);
		const detail = err instanceof Error ? `: ${err.message}` : "";
		const baseName = document.uri.path.split("/").pop() ?? document.uri.path;
		vscode.window.showErrorMessage(
			`Jiscribe: Failed to write canvas changes to "${baseName}"${detail}. Your latest edits are NOT saved.`,
		);
	}

	/**
	 * Send the file's current contents to the Webview. Called when the file
	 * changes externally or when the Webview signals it's ready.
	 */
	private updateWebview(
		panel: vscode.WebviewPanel,
		document: vscode.TextDocument,
		saveNonce?: string,
	) {
		const message: ExtensionToWebviewMessage = {
			type: "update",
			data: toWebviewDocSource(document.getText()),
			saveNonce,
			docType: "json",
		};
		panel.webview.postMessage(message);
	}

	/**
	 * Write a Webview edit back to the file via WorkspaceEdit, so it participates
	 * in the Undo/Redo history.
	 *
	 * async so the Thenable<boolean> from applyEdit() (which has no .catch())
	 * becomes a Promise<boolean>, letting callers use .then(..., onRejected).
	 */
	private async updateTextDocument(
		document: vscode.TextDocument,
		json: string,
	): Promise<boolean> {
		const edit = new vscode.WorkspaceEdit();

		// Range covering the whole document. lineCount is 1-based but the end line
		// index is 0-based, so lineCount - 1 is the last line.
		const lastLine = document.lineAt(document.lineCount - 1);
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount - 1, lastLine.text.length),
			json,
		);

		return vscode.workspace.applyEdit(edit);
	}
}
