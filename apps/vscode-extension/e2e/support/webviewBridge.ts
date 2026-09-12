import * as vscode from "vscode";

import { EXTENSION_ID } from "./customEditor";
import type { ExtensionToWebviewMessage } from "../../src/types/messages";
import type { JiscribeTestApi } from "../../src/types/testApi";

/**
 * Standing in for the Webview.
 *
 * A Webview is an isolated iframe: the e2e suite can neither post messages as
 * one nor read what the extension posts to it. The extension therefore hands out
 * a bridge in ExtensionMode.Test (src/editor/webviewBridgeRegistry.ts), and this
 * is how a suite reaches it.
 */

/** The bridge as a test uses it: inject as the Webview, observe what is sent to it. */
export type WebviewBridge = JiscribeTestApi["webviewBridge"];

/** An `update` message to the Webview, the only kind these suites assert on. */
export type UpdateToWebviewMessage = Extract<
	ExtensionToWebviewMessage,
	{ type: "update" }
>;

/**
 * Get the extension's Test-mode bridge, activating the extension if needed.
 *
 * @returns the bridge; rejects when the extension is missing, or when it
 *   exported nothing because the host VSCode is not in ExtensionMode.Test
 */
export async function connectWebviewBridge(): Promise<WebviewBridge> {
	const extension = vscode.extensions.getExtension(EXTENSION_ID);
	if (!extension) {
		throw new Error(
			`Extension ${EXTENSION_ID} is not installed in this VSCode instance`,
		);
	}
	const testApi = (
		extension.isActive ? extension.exports : await extension.activate()
	) as JiscribeTestApi | undefined;
	if (!testApi) {
		throw new Error(
			`Extension ${EXTENSION_ID} exported nothing: activate() returns its Test API only in vscode.ExtensionMode.Test, so this run is not going through --extensionTestsPath`,
		);
	}
	return testApi.webviewBridge;
}

/** Collects the messages the extension posts to one document's Webview. */
export interface WebviewMessageRecorder extends vscode.Disposable {
	/** Every message posted to that Webview since recording began, in order. */
	readonly messages: readonly ExtensionToWebviewMessage[];
}

/**
 * Record what the extension posts to one document's Webview.
 *
 * @param bridge - from {@link connectWebviewBridge}
 * @param uri - the document to watch; recording may start before its editor
 *   opens, and messages posted before the Webview is ready are recorded too
 * @returns a recorder to dispose before the test ends; an undisposed listener
 *   outlives the suite and keeps recording
 */
export function recordMessagesToWebview(
	bridge: WebviewBridge,
	uri: vscode.Uri,
): WebviewMessageRecorder {
	const messages: ExtensionToWebviewMessage[] = [];
	const subscription = bridge.onMessageToWebview(uri.toString(), (message) => {
		messages.push(message);
	});
	return {
		messages,
		dispose: () => subscription.dispose(),
	};
}

/**
 * The recorded `update` messages, in arrival order.
 *
 * @param recorder - a recorder from {@link recordMessagesToWebview}; any other
 *   message kind (requestImageExport) is dropped here
 */
export function updateMessages(
	recorder: WebviewMessageRecorder,
): UpdateToWebviewMessage[] {
	return recorder.messages.filter(
		(message): message is UpdateToWebviewMessage => message.type === "update",
	);
}

/**
 * Post a message to a document's editor as if its Webview had sent it.
 *
 * @param bridge - from {@link connectWebviewBridge}
 * @param uri - the document whose editor handles the message; it must be open in
 *   a canvas editor, or the bridge throws naming the URI
 * @param message - any Webview → Extension message; `update` is the commit the
 *   canvas sends after an edit
 */
export function postAsWebview(
	bridge: WebviewBridge,
	uri: vscode.Uri,
	message: Parameters<WebviewBridge["postAsWebview"]>[1],
): void {
	bridge.postAsWebview(uri.toString(), message);
}
