import * as vscode from "vscode";

import { resolveDocImage } from "./resolveDocImage";
import { saveExportedImage } from "./saveExportedImage";
import type { WebviewBridgeRegistry } from "./webviewBridgeRegistry";
import { getCanvasWebviewHtml } from "./webviewHtml";
import type {
	ExtensionToWebviewMessage,
	JiscribeDocType,
	WebviewToExtensionMessage,
} from "../types/messages";
import { isWebviewToExtensionMessage } from "../types/webviewMessageGuard";

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
	/**
	 * Registry the panel is announced to for the lifetime of the editor, so the
	 * e2e suite can drive this Webview's side of the protocol (inert outside
	 * ExtensionMode.Test, see webviewBridgeRegistry).
	 */
	bridgeRegistry: WebviewBridgeRegistry;
	/** The Webview initialized and wants the document's current contents. */
	onReady: () => void;
	/**
	 * A canvas edit arrived; `data` is the doc's JSON text and `baseVersion` the
	 * `version` of the newest update this Webview had received when the edit was
	 * committed, undefined when none carried one (see the `update` messages in
	 * types/messages.ts).
	 */
	onUpdate: (data: string, baseVersion: number | undefined) => void;
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

/** The one way to send a message to a resolved panel's Webview. */
export interface CanvasWebviewChannel {
	/**
	 * Post to the Webview, announcing the message to the bridge registry first.
	 *
	 * @param message - delivered as sent; a panel whose Webview was discarded
	 *   (retainContextWhenHidden: false) drops it, as postMessage always has
	 */
	post(message: ExtensionToWebviewMessage): void;
	/**
	 * Post the document's current contents, the one message both editors send.
	 *
	 * @param update - the contents to send: `data` as the docType prescribes
	 *   (JSON text for every kind, empty when an image carries no source),
	 *   `docType` naming the edited file's kind, and `version` the
	 *   `vscode.TextDocument.version` it was read at, omitted by the image editor
	 *   because a CustomDocument has none
	 */
	postUpdate(update: {
		data: string;
		docType: JiscribeDocType;
		version?: number;
	}): void;
}

/**
 * Boot the Canvas Webview in a panel and wire its message channel, shared by the
 * `.jis` and `.jis.png` / `.jis.svg` editors.
 *
 * Undo / redo / image export behave the same in both editors, so they are
 * handled here; only the messages that touch the document model are delegated to
 * the caller.
 *
 * @param panel - the Webview panel to take over; its options and html are replaced
 * @param options - document URIs, the bridge registry and the per-editor message
 *   handlers
 * @returns the channel to the panel's Webview; every message to this Webview has
 *   to go through it, or the bridge registry (and with it the e2e suite) never
 *   sees the message
 */
export function resolveCanvasWebview(
	panel: vscode.WebviewPanel,
	options: CanvasWebviewOptions,
): CanvasWebviewChannel {
	// Enable script execution in the Webview (disabled by default), and narrow
	// the roots it may address to the bundle's own directory. The default roots
	// are every workspace folder, which `img-src ${cspSource}` would then let the
	// Webview read; nothing here needs them, because a doc's images travel as
	// base64 over postMessage (see resolveDocImage).
	panel.webview.options = {
		enableScripts: true,
		localResourceRoots: [vscode.Uri.joinPath(options.extensionUri, "dist")],
	};
	panel.webview.html = getCanvasWebviewHtml(
		panel.webview,
		options.extensionUri,
	);

	const documentKey = options.documentUri.toString();

	const post: CanvasWebviewChannel["post"] = (message) => {
		options.bridgeRegistry.notifySentToWebview(documentKey, message);
		panel.webview.postMessage(message);
	};

	const postUpdate: CanvasWebviewChannel["postUpdate"] = (update) => {
		post({ type: "update", ...update });
	};

	/**
	 * The panel's inbound protocol, shared by the real Webview and the bridge, so
	 * an injected message takes exactly the path a posted one does. Messages from
	 * the real Webview pass isWebviewToExtensionMessage first; the bridge is
	 * driven by typed test code.
	 */
	function handleWebviewMessage(message: WebviewToExtensionMessage): void {
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
				options.onUpdate(message.data, message.baseVersion);
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

			case "resolveImage":
				// Read the image an `image` shape names and post its bytes back.
				void resolveDocImage(
					post,
					options.documentUri,
					message.requestId,
					message.src,
				);
				break;
		}
	}

	// Retain the message listener's Disposable and dispose it in onDidDispose;
	// dropping it leaks a listener per editor open.
	const messageListener = panel.webview.onDidReceiveMessage(
		(value: unknown) => {
			// postMessage carries whatever the Webview sends, so check the shape
			// before acting on it: a malformed message used to throw inside a voided
			// promise, leaving the Webview's request pending forever.
			if (!isWebviewToExtensionMessage(value)) {
				console.warn(
					"[Jiscribe] Ignoring malformed message from Webview:",
					value,
				);
				return;
			}
			handleWebviewMessage(value);
		},
	);

	const bridgeRegistration = options.bridgeRegistry.register(documentKey, {
		receiveFromWebview: handleWebviewMessage,
	});

	panel.onDidDispose(() => {
		messageListener.dispose();
		bridgeRegistration.dispose();
		options.onDispose?.();
	});

	return { post, postUpdate };
}
