import * as vscode from "vscode";

import { saveExportedImage } from "./saveExportedImage";
import { getCanvasWebviewHtml } from "./webviewHtml";
import type { WebviewToExtensionMessage } from "../types/messages";

/**
 * Per-editor wiring handed to resolveCanvasWebview. The document-shaped
 * messages (ready / update) differ between the text and image editors, so they
 * arrive as callbacks; the rest of the protocol is handled in one place.
 */
export interface CanvasWebviewOptions {
	/** Extension root, used to resolve the Webview bundle URIs. */
	extensionUri: vscode.Uri;
	/** URI of the edited document; the export dialog derives its file name from it. */
	documentUri: vscode.Uri;
	/** The Webview initialized and wants the document's current contents. */
	onReady: () => void;
	/**
	 * A canvas edit arrived. `saveNonce` identifies the write so the Webview can
	 * recognize its own save echoing back.
	 */
	onUpdate: (data: string, saveNonce: string) => void;
	/**
	 * Response to requestImageExport; `data` is null when the image could not be
	 * generated. Image editor only — omit it and such messages are ignored.
	 */
	onImageExportResult?: (requestId: number, data: string | null) => void;
	/**
	 * The canvas mounted and can export an image now. Image editor only (see the
	 * "rendered" message on WebviewToExtensionMessage).
	 */
	onRendered?: () => void;
	/** Extra cleanup to run when the panel closes, in addition to the listeners. */
	onDispose?: () => void;
}

/**
 * Boot the Canvas Webview in a panel and wire its message channel, shared by the
 * `.jis.json` and `.jis.png` / `.jis.svg` editors.
 *
 * Undo / redo / image export behave the same in both editors, so they are
 * handled here; only the messages that touch the document model are delegated to
 * the caller.
 *
 * @param panel - the Webview panel to take over; its options and html are replaced
 * @param options - document URIs and the per-editor message handlers
 */
export function resolveCanvasWebview(
	panel: vscode.WebviewPanel,
	options: CanvasWebviewOptions,
): void {
	// Enable script execution in the Webview (disabled by default).
	panel.webview.options = { enableScripts: true };
	panel.webview.html = getCanvasWebviewHtml(
		panel.webview,
		options.extensionUri,
	);

	// Retain the message listener's Disposable and dispose it in onDidDispose;
	// dropping it leaks a listener per editor open.
	const messageListener = panel.webview.onDidReceiveMessage(
		(message: WebviewToExtensionMessage) => {
			switch (message.type) {
				case "ready":
					options.onReady();
					break;

				case "undo":
					vscode.commands.executeCommand("undo");
					break;

				case "redo":
					vscode.commands.executeCommand("redo");
					break;

				case "update":
					options.onUpdate(message.data, message.saveNonce);
					break;

				case "imageExportResult":
					options.onImageExportResult?.(message.requestId, message.data);
					break;

				case "rendered":
					options.onRendered?.();
					break;

				case "exportImage":
					// Save the exported image to the workspace (save dialog → write → notify).
					void saveExportedImage(
						options.documentUri,
						message.format,
						message.base64,
						message.includesSource,
					);
					break;
			}
		},
	);

	panel.onDidDispose(() => {
		messageListener.dispose();
		options.onDispose?.();
	});
}
