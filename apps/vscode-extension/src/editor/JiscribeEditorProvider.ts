import * as vscode from "vscode";

import { resolveCanvasWebview } from "./resolveCanvasWebview";
import {
	createSelfWriteTracker,
	type DocumentEndOfLine,
} from "./selfWriteTracker";
import { toWebviewDocSource } from "../canvasDocSource";
import type { ExtensionToWebviewMessage } from "../types/messages";

/** The document's line ending as the string its text actually holds. */
function documentEndOfLine(document: vscode.TextDocument): DocumentEndOfLine {
	return document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
}

/**
 * Custom editor provider that shows the Canvas UI when a .jis file opens.
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
	 * Called by VSCode each time a .jis file opens. Initializes the Webview
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
		// Writes this editor made, so their echo can be told apart from a genuine
		// external change by content (see selfWriteTracker).
		const selfWriteTracker = createSelfWriteTracker();

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
			(e) => {
				if (e.document.uri.toString() !== document.uri.toString()) {
					return;
				}

				// Metadata-only event (no ranges): VSCode raises one when a clean
				// document turns dirty, right after the content event of the same
				// edit. The text did not move, so there is nothing to forward, and
				// letting it reach the tracker would clear the queue on every commit.
				if (e.contentChanges.length === 0) {
					return;
				}

				// Our own write echoing back. The Canvas already holds this state, and
				// an echo forwarded after a newer commit would be applied as an external
				// change and revert the canvas to the older document.
				if (selfWriteTracker.isSelfWrite(document.getText())) {
					return;
				}

				this.updateWebview(webviewPanel, document);
			},
		);

		resolveCanvasWebview(webviewPanel, {
			extensionUri: this.context.extensionUri,
			documentUri: document.uri,

			// Webview is initialized; send the initial file contents.
			onReady: () => this.updateWebview(webviewPanel, document),

			onUpdate: (data) => {
				// Write the canvas edit back to the file. Track the text before the
				// write, because applyEdit() is async and onDidChangeTextDocument may
				// fire before it resolves. The two-arg .then(onFulfilled, onRejected)
				// is used so an exception thrown inside onFulfilled does not reach
				// onRejected.
				const trackedText = selfWriteTracker.track(
					data,
					documentEndOfLine(document),
				);
				this.updateTextDocument(document, data).then(
					(applied) => {
						// applyEdit() can resolve false instead of rejecting (e.g. the
						// document is already closed); either way, notify the user it
						// wasn't saved.
						if (!applied) {
							selfWriteTracker.untrack(trackedText);
							this.notifySaveFailure(document, undefined);
						}
					},
					(err: unknown) => {
						// Nothing reached the document, so drop the tracked text;
						// otherwise it would swallow a later external change that happens
						// to match it.
						selfWriteTracker.untrack(trackedText);
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
