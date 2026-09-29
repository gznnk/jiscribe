// The messages the canvas host (the MCP process) and the viewer (the browser)
// exchange over their single WebSocket.
//
// There are two kinds of thing to carry.
//
// 1. File synchronisation. The source of truth is the .jis in the workspace;
//    the AI rewrites it through the MCP tools, and a person fixes it in the viewer
//    and saves. A one-way notification is enough here, except for the flush before
//    the host moves to another file, which has to be waited on.
// 2. Operations that need a mounted canvas (capture, camera, selection,
//    measurement). The file holds no answer, so there is nothing for it but to ask
//    the viewer, which makes it a round trip under a requestId.

import type { AiHandleOp } from "@jiscribe/ai-tools";

/**
 * The query naming a viewer that nobody can see (the AI's eye). The host puts it
 * on the page URL it opens and the page puts it back on the WebSocket URL, so
 * both the page and the socket can be told apart from a window a person is
 * looking at. Written without the leading "?" so it reads as a search parameter
 */
export const HEADLESS_VIEWER_QUERY = "headless=1";

/**
 * Whether a URL's query marks a headless viewer. Read the same way on the page
 * and on the upgrade request, so the two cannot disagree over a window.
 *
 * @param search The query string, with or without its leading `?`
 */
export const isHeadlessViewerSearch = (search: string): boolean =>
	search.replace(/^\?/, "").split("&").includes(HEADLESS_VIEWER_QUERY);

/** Server to viewer */
export type CanvasHostServerMessage =
	// Arrives right after connecting, and whenever the file to open changes
	| {
			type: "openCanvas";
			relPath: string;
			docText: string;
			/** The revision of docText, to be sent back on the write that replaces it */
			revision: string;
	  }
	// The open file was rewritten from outside (an AI tool, another editor)
	| {
			type: "docChanged";
			relPath: string;
			docText: string;
			/** The revision of docText, to be sent back on the write that replaces it */
			revision: string;
	  }
	// The file cannot be read, or is broken. The viewer only shows the message
	| { type: "docError"; relPath: string; message: string }
	// A query about the drawn result, to be answered with the requestId attached
	| { type: "handleOpRequest"; requestId: string; op: AiHandleOp }
	// A request to write out the edits still sitting on the save debounce, answered
	// with "flushed" once they are on disk. The host sends it before it moves to
	// another file, since the file API takes a write only for the file on display
	| { type: "flushEdits"; requestId: string }
	// A request to close the window. Whether it closed shows in the connection being
	// cut, so there is no reply to this one
	| { type: "closeViewer" };

// A person's save is not in here: it goes through the file API (PUT), which is
// where the host learns of it and where the revision it carries is checked.

/** Viewer to server */
export type CanvasHostClientMessage =
	// The answer to a flushEdits: the buffered edits are written out, or the write
	// failed and the viewer is showing why. Either way the host waits no longer
	| { type: "flushed"; requestId: string }
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
		case "flushed":
			return typeof value.requestId === "string";
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

/**
 * Checks whether a received frame has the shape of a message from the canvas
 * host. The mirror image of isCanvasHostClientMessage, for the page.
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
