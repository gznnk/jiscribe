import type {
	ImageRequestId,
	ImageResolvedMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

/** Sends a message to the Extension (acquireVsCodeApi().postMessage). */
export type ExtensionPostMessage = (message: WebviewToExtensionMessage) => void;

/**
 * The two halves of the image channel: the function Canvas calls and the
 * Extension's answers coming back the other way. They share the pending map, so
 * both come from one {@link createWebviewImageResolver} call.
 */
export interface WebviewImageResolver {
	/**
	 * Resolves an `image` shape's `src` to its bytes; handed to Canvas as its
	 * `resolveImage` prop. Rejects when the Extension cannot supply the file.
	 */
	resolveImage: (src: string) => Promise<Blob>;
	/** Settles the request an "imageResolved" message answers; ignores an unknown id. */
	handleImageResolved: (message: ImageResolvedMessage) => void;
}

/**
 * A random prefix for one page's request ids, so an answer addressed to a
 * discarded page can never match a request of the page that replaced it.
 */
const createPageNonce = (): string => {
	const random = new Uint32Array(2);
	crypto.getRandomValues(random);
	return Array.from(random, (part) => part.toString(36)).join("");
};

/** Decode base64 image bytes into a typed Blob (no data-URL header involved). */
const base64ToBlob = (base64: string, mimeType: string): Blob => {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return new Blob([bytes], { type: mimeType });
};

/**
 * Build the Webview's image resolver over the Extension message channel.
 *
 * The Webview cannot read the workspace itself, so every `src` becomes a
 * resolveImage round trip identified by a request id, and the matching
 * imageResolved settles it. Nothing is cached here, but the canvas asks once per
 * `src` per mount, so an image edited on disk shows its new contents only once the
 * page is rebuilt: on reopening the document, or when its tab is hidden and shown
 * again (#138 discards the hidden Webview).
 *
 * The ids carry a nonce drawn for this resolver, which is built once per page: a
 * bare counter would restart on the page VSCode builds after hiding the tab (#138)
 * and collide with the answers still owed to the page it replaced.
 *
 * @param postMessage - sends a message to the Extension; called once per resolveImage call
 * @returns the resolver to give Canvas plus the intake for imageResolved messages
 */
export function createWebviewImageResolver(
	postMessage: ExtensionPostMessage,
): WebviewImageResolver {
	const pendingRequests = new Map<
		ImageRequestId,
		{ resolve: (blob: Blob) => void; reject: (reason: Error) => void }
	>();
	const pageNonce = createPageNonce();
	let nextRequestNumber = 1;

	return {
		resolveImage: (src) =>
			new Promise<Blob>((resolve, reject) => {
				const requestId = `${pageNonce}-${nextRequestNumber}`;
				nextRequestNumber += 1;
				pendingRequests.set(requestId, { resolve, reject });
				postMessage({ type: "resolveImage", requestId, src });
			}),

		handleImageResolved: (message) => {
			const pending = pendingRequests.get(message.requestId);
			// A second answer to the same id (or one for a request this resolver never
			// made) has nothing to settle; the Promise is already done.
			if (!pending) {
				return;
			}
			pendingRequests.delete(message.requestId);
			if (message.ok) {
				pending.resolve(base64ToBlob(message.base64, message.mimeType));
			} else {
				pending.reject(new Error(message.error));
			}
		},
	};
}
