import type * as vscode from "vscode";

import {
	postAsWebview,
	type WebviewBridge,
	type WebviewMessageRecorder,
} from "./webviewBridge";
import type { ExtensionToWebviewMessage } from "../../src/types/messages";

/**
 * Standing in for the Webview at save time.
 *
 * Saving a `.jis.png` / `.jis.svg` asks the Webview to render the image and waits
 * for its answer, so what lands on disk depends on who answers. These helpers let
 * a suite answer instead, which is what makes those bytes something to assert on.
 */

/** A `requestImageExport`: the extension asking for rendered image bytes. */
export type ImageExportRequestMessage = Extract<
	ExtensionToWebviewMessage,
	{ type: "requestImageExport" }
>;

/** The image format one request asks for, as the save path names it. */
export type ImageExportFormat = ImageExportRequestMessage["format"];

/**
 * Produces the answer to one request.
 *
 * @param format - the format asked for, which for a plain save is the document's
 *   own kind
 * @returns the image bytes to answer with, or null for the "the canvas could not
 *   produce an image" answer that sends the save to its fallback
 */
export type ImageExportResponder = (
	format: ImageExportFormat,
) => Uint8Array | null;

/**
 * Answer every `requestImageExport` the extension posts for one document.
 *
 * This beats the real Webview to the answer, which is the whole point: the
 * registry notifies its listeners synchronously from inside `channel.post`,
 * before `panel.webview.postMessage` hands the message to the Webview at all
 * (see src/editor/resolveCanvasWebview.ts). Answering from the listener therefore
 * settles the extension's pending export before the real Webview has seen the
 * request, and the real answer arrives later against a requestId that is no
 * longer pending and is dropped.
 *
 * @param bridge - from `connectWebviewBridge` (./webviewBridge)
 * @param uri - the document whose requests are answered; requests for any other
 *   document are left to its own Webview
 * @param respond - called once per request, synchronously inside the post
 * @returns a disposer to call before the test ends; until then every request for
 *   this document is answered, including one from a save the test did not start
 */
export function answerImageExportRequests(
	bridge: WebviewBridge,
	uri: vscode.Uri,
	respond: ImageExportResponder,
): vscode.Disposable {
	const subscription = bridge.onMessageToWebview(uri.toString(), (message) => {
		if (message.type !== "requestImageExport") {
			return;
		}
		const bytes = respond(message.format);
		postAsWebview(bridge, uri, {
			type: "imageExportResult",
			requestId: message.requestId,
			// Base64 for PNG and SVG alike, as the protocol carries both.
			data: bytes === null ? null : Buffer.from(bytes).toString("base64"),
		});
	});
	return { dispose: () => subscription.dispose() };
}

/**
 * The recorded `requestImageExport` messages, in arrival order.
 *
 * @param recorder - a recorder from `recordMessagesToWebview`; its `update`
 *   messages are dropped here. An empty result is how a test shows the extension
 *   never asked a Webview it knew could not answer.
 */
export function imageExportRequests(
	recorder: WebviewMessageRecorder,
): ImageExportRequestMessage[] {
	return recorder.messages.filter(
		(message): message is ImageExportRequestMessage =>
			message.type === "requestImageExport",
	);
}
