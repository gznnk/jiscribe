/**
 * Seam that lets a test stand in for the Webview, extracted from the editor
 * providers so it needs no VSCode API (the same shape as selfWriteTracker).
 *
 * A Webview is an isolated iframe: VSCode offers a test no way to post messages
 * as one, nor to see what the extension posts to it. So the editor side of every
 * canvas panel registers here, and the test side of the registry drives that
 * registration — messages injected as the Webview reach the very handler the
 * panel's onDidReceiveMessage runs, and every message the extension posts is
 * announced to whoever is listening.
 *
 * Outside ExtensionMode.Test nothing reads the test face (activate returns the
 * registry only in that mode, see src/types/testApi.ts), so the registry is
 * inert: registrations are made and disposed, and no listener ever fires.
 *
 * Registrations are keyed by `uri.toString()` rather than by document or panel
 * object, because a test names the document it wants by URI and holds neither of
 * those. One key means one panel, which
 * `supportsMultipleEditorsPerDocument: false` guarantees.
 */

import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

/** Releases a registration or a listener; the caller's own type, not vscode.Disposable. */
export interface WebviewBridgeDisposer {
	dispose(): void;
}

/** The editor side of one canvas panel, as the registry reaches it. */
export interface WebviewBridgeEndpoint {
	/**
	 * Handle a message as if the panel's Webview had posted it.
	 *
	 * @param message - the same value `panel.webview.onDidReceiveMessage` would
	 *   deliver; handled by the same function, so nothing about the editor's
	 *   behaviour is test-only
	 */
	receiveFromWebview(message: WebviewToExtensionMessage): void;
}

/** Called for every message the extension posts to one document's Webview. */
export type MessageToWebviewListener = (
	message: ExtensionToWebviewMessage,
) => void;

/**
 * Registry of the live canvas panels, with an editor face (register / notify)
 * and a test face (inject / observe).
 */
export interface WebviewBridgeRegistry {
	/**
	 * Attach a panel's message handler, so the test face can reach it.
	 *
	 * @param documentKey - `uri.toString()` of the edited document; registering a
	 *   key again replaces the endpoint (VSCode may resolve a replacement panel
	 *   before the old one's onDidDispose runs, the ordering the image editor's
	 *   own panel map guards against too), so a seam that exists for tests can
	 *   never stop an editor from opening
	 * @param endpoint - receives the messages a test injects
	 * @returns a disposer to call when the panel closes; it removes only this
	 *   endpoint, so a stale disposer cannot drop a newer panel's registration
	 */
	register(
		documentKey: string,
		endpoint: WebviewBridgeEndpoint,
	): WebviewBridgeDisposer;
	/**
	 * Announce a message the extension is about to post to a Webview.
	 *
	 * Called by the channel resolveCanvasWebview returns, before the real post, so
	 * a listener sees messages sent before the Webview is ready as well as after.
	 *
	 * @param documentKey - `uri.toString()` of the document being posted to; one
	 *   with no registration and no listener is not an error (the panel may
	 *   already be gone)
	 * @param message - the value handed to `panel.webview.postMessage`
	 */
	notifySentToWebview(
		documentKey: string,
		message: ExtensionToWebviewMessage,
	): void;
	/**
	 * Deliver a message to a document's editor as if its Webview had posted it.
	 *
	 * @param documentKey - `uri.toString()` of the document whose editor handles
	 *   it; throws naming the key when no panel is registered for it, rather than
	 *   discarding the message
	 * @param message - any Webview → Extension message, `update` included
	 */
	postAsWebview(documentKey: string, message: WebviewToExtensionMessage): void;
	/**
	 * Observe the messages the extension posts to one document's Webview.
	 *
	 * @param documentKey - `uri.toString()` of the document to watch; a document
	 *   with no panel yet is allowed, so a listener can be attached before the
	 *   editor opens
	 * @param listener - called in post order, synchronously inside the post
	 * @returns a disposer; after it the listener is never called again
	 */
	onMessageToWebview(
		documentKey: string,
		listener: MessageToWebviewListener,
	): WebviewBridgeDisposer;
}

export function createWebviewBridgeRegistry(): WebviewBridgeRegistry {
	const endpointsByDocumentKey = new Map<string, WebviewBridgeEndpoint>();
	const listenersByDocumentKey = new Map<
		string,
		Set<MessageToWebviewListener>
	>();

	return {
		register(documentKey, endpoint) {
			endpointsByDocumentKey.set(documentKey, endpoint);
			return {
				dispose: () => {
					// Only while it is still this endpoint, so disposing twice (or
					// disposing after the key was registered again) cannot drop a
					// registration that belongs to another panel.
					if (endpointsByDocumentKey.get(documentKey) === endpoint) {
						endpointsByDocumentKey.delete(documentKey);
					}
				},
			};
		},

		notifySentToWebview(documentKey, message) {
			const listeners = listenersByDocumentKey.get(documentKey);
			if (!listeners) {
				return;
			}
			// A copy, so a listener disposing itself (or another) mid-notification
			// cannot change the set being iterated.
			for (const listener of [...listeners]) {
				listener(message);
			}
		},

		postAsWebview(documentKey, message) {
			const endpoint = endpointsByDocumentKey.get(documentKey);
			if (!endpoint) {
				throw new Error(
					`No canvas panel is registered for ${documentKey}; open the document in a canvas editor before posting as its Webview`,
				);
			}
			endpoint.receiveFromWebview(message);
		},

		onMessageToWebview(documentKey, listener) {
			const listeners =
				listenersByDocumentKey.get(documentKey) ??
				new Set<MessageToWebviewListener>();
			listeners.add(listener);
			listenersByDocumentKey.set(documentKey, listeners);
			return {
				dispose: () => {
					listeners.delete(listener);
					if (listeners.size === 0) {
						listenersByDocumentKey.delete(documentKey);
					}
				},
			};
		},
	};
}
