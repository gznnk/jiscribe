// The messages the canvas host (the MCP process) and the viewer (the browser)
// exchange over their single WebSocket.
//
// There are two kinds of thing to carry.
//
// 1. File synchronisation. The source of truth is the .jis.json in the workspace;
//    the AI rewrites it through the MCP tools, and a person fixes it in the viewer
//    and saves. A one-way notification is enough here.
// 2. Operations that need a mounted canvas (capture, camera, selection,
//    measurement). The file holds no answer, so there is nothing for it but to ask
//    the viewer, which makes it a round trip under a requestId.

import type { AiHandleOp } from "@jiscribe/ai-tools";

/** Server to viewer */
export type CanvasHostServerMessage =
	// Arrives right after connecting, and whenever the file to open changes
	| { type: "openCanvas"; relPath: string; docText: string }
	// The open file was rewritten from outside (an AI tool, another editor)
	| { type: "docChanged"; relPath: string; docText: string }
	// The file cannot be read, or is broken. The viewer only shows the message
	| { type: "docError"; relPath: string; message: string }
	// A query about the drawn result, to be answered with the requestId attached
	| { type: "handleOpRequest"; requestId: string; op: AiHandleOp }
	// A request to close the window. Whether it closed shows in the connection being
	// cut, so there is no reply to this one
	| { type: "closeViewer" };

/** Viewer to server */
export type CanvasHostClientMessage =
	// A person edited the canvas and the viewer finished saving. The server keeps
	// this text as the latest it knows of, cancelling out the watch's self-echo
	| { type: "saved"; relPath: string; docText: string }
	// The answer to a handleOpRequest. With ok=false, text is the failure reason as
	// it goes to the AI
	| {
			type: "handleOpResult";
			requestId: string;
			ok: boolean;
			text: string;
			/** The PNG (base64, no data-URL prefix), present only for capture_canvas */
			imagePngBase64?: string;
	  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/**
 * Checks whether a received frame has the shape of a message from the viewer. The
 * input comes over the network, so for each type the required properties are checked
 * for presence and type.
 *
 * @param value A frame that has already been through JSON.parse; the caller is to
 *   throw away anything that failed to parse
 */
export function isCanvasHostClientMessage(
	value: unknown,
): value is CanvasHostClientMessage {
	if (!isRecord(value)) {
		return false;
	}
	switch (value.type) {
		case "saved":
			return (
				typeof value.relPath === "string" && typeof value.docText === "string"
			);
		case "handleOpResult":
			return (
				typeof value.requestId === "string" &&
				typeof value.ok === "boolean" &&
				typeof value.text === "string" &&
				(value.imagePngBase64 === undefined ||
					typeof value.imagePngBase64 === "string")
			);
		default:
			return false;
	}
}
