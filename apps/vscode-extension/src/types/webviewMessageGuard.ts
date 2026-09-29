/**
 * Runtime check for the messages the Webview posts to the Extension.
 *
 * postMessage carries plain JSON, so the Extension side receives `unknown` no
 * matter what {@link WebviewToExtensionMessage} promises: a compromised or
 * merely buggy Webview can post any shape. Every variant is checked here before
 * the host acts on it, mirroring `isExtensionToWebviewMessage` on the Webview
 * side (src/webview/index.tsx).
 */

import type { WebviewToExtensionMessage } from "./messages";

/**
 * Whether `value` is a well-formed Webview → Extension message.
 *
 * @param value - the raw payload from `onDidReceiveMessage`; anything but an
 *   object carrying a known `type` and that variant's required fields at their
 *   declared types is rejected, extra fields are ignored
 * @returns true when the caller may treat `value` as
 *   {@link WebviewToExtensionMessage}
 */
export function isWebviewToExtensionMessage(
	value: unknown,
): value is WebviewToExtensionMessage {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const message = value as Record<string, unknown>;
	switch (message.type) {
		case "ready":
		case "undo":
		case "redo":
		case "rendered":
			return true;
		case "update":
			return (
				typeof message.data === "string" &&
				(message.baseVersion === undefined ||
					typeof message.baseVersion === "number")
			);
		case "imageExportResult":
			return (
				typeof message.requestId === "number" &&
				(typeof message.data === "string" || message.data === null)
			);
		case "exportImage":
			return (
				(message.format === "png" || message.format === "svg") &&
				typeof message.base64 === "string" &&
				typeof message.includesSource === "boolean"
			);
		case "resolveImage":
			return (
				typeof message.requestId === "string" && typeof message.src === "string"
			);
		default:
			return false;
	}
}
