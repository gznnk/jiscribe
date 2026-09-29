/**
 * Runtime check for the messages the Extension posts to the Webview.
 *
 * The CSP is `default-src 'none'`, so there is no cross-origin frame that could
 * postMessage here; this is a defense-in-depth gate (#183) that whitelists known
 * `type`s and checks each variant's required fields before dispatch, so an
 * unexpected sender cannot drive the update / export handlers. The mirror of
 * {@link isWebviewToExtensionMessage} (./webviewMessageGuard.ts), which covers
 * the other direction.
 */

import type { ExtensionToWebviewMessage } from "./messages";

/**
 * Whether `value` is a well-formed Extension → Webview message.
 *
 * @param value - the raw payload from a window "message" event; anything but an
 *   object carrying a known `type` and that variant's required fields at their
 *   declared types is rejected, extra fields are ignored
 * @returns true when the caller may treat `value` as
 *   {@link ExtensionToWebviewMessage}
 */
export function isExtensionToWebviewMessage(
	value: unknown,
): value is ExtensionToWebviewMessage {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const message = value as Record<string, unknown>;
	switch (message.type) {
		case "update":
			return (
				typeof message.data === "string" &&
				(message.version === undefined || typeof message.version === "number")
			);
		case "requestImageExport":
			return (
				typeof message.requestId === "number" &&
				(message.format === "png" || message.format === "svg")
			);
		case "imageResolved":
			if (typeof message.requestId !== "string") {
				return false;
			}
			return message.ok === true
				? typeof message.base64 === "string" &&
						typeof message.mimeType === "string"
				: message.ok === false && typeof message.error === "string";
		default:
			return false;
	}
}
