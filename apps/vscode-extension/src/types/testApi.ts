/**
 * What the extension exposes to its own e2e suite.
 *
 * `activate` returns this only when `context.extensionMode` is
 * `vscode.ExtensionMode.Test`, so a normal session exports nothing; the e2e
 * suites read it off `vscode.extensions.getExtension(...).exports`.
 */

import type { WebviewBridgeRegistry } from "../editor/webviewBridgeRegistry";

/** The extension's Test-mode API, as `Extension.exports`. */
export interface JiscribeTestApi {
	/**
	 * Stand in for a document's Webview: inject the messages it would post, and
	 * observe the ones the extension posts to it. Only the test face of the
	 * registry is exposed — registering a panel is the editor's business.
	 */
	webviewBridge: Pick<
		WebviewBridgeRegistry,
		"postAsWebview" | "onMessageToWebview"
	>;
}
