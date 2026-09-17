// The type guard for the frames the canvas host sends this page.
//
// The mirror of the host's isCanvasHostClientMessage
// (../shared/canvasHostProtocol): what arrives here came over the network, so
// every property a frame is read for is checked before the page acts on it.

import type { CanvasHostServerMessage } from "../shared/canvasHostProtocol";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/**
 * Checks whether a received frame has the shape of a message from the canvas
 * host.
 *
 * @param value A frame that has already been through JSON.parse; anything that
 *   failed to parse is the caller's to throw away. A doc frame without the
 *   revision the next write has to quote is rejected along with the malformed
 *   ones, since writing back without it is refused by the host anyway
 */
export function isCanvasHostServerMessage(
	value: unknown,
): value is CanvasHostServerMessage {
	if (!isRecord(value)) {
		return false;
	}
	switch (value.type) {
		case "openCanvas":
		case "docChanged":
			return (
				typeof value.relPath === "string" &&
				typeof value.docText === "string" &&
				typeof value.revision === "string"
			);
		case "docError":
			return (
				typeof value.relPath === "string" && typeof value.message === "string"
			);
		case "handleOpRequest":
			return (
				typeof value.requestId === "string" &&
				typeof value.op === "object" &&
				value.op !== null
			);
		case "flushEdits":
			return typeof value.requestId === "string";
		case "closeViewer":
			return true;
		default:
			return false;
	}
}
