// The contract whoever holds the document (the canvas in a browser, or a server
// reading and writing files) hands to the side that applies operations. It has
// the same shape as editor-shell's EditorDocBridge, but is deliberately defined
// on its own so that the agent layer does not depend on the UI shell.

import type { CanvasDoc } from "@jiscribe/canvas";

/**
 * A handle on the document being edited. It is the only way to read and write
 * the document from outside the canvas, and when the UI holds it, keep it the
 * same object for as long as the panel is mounted (to avoid re-subscribing).
 */
export type AiDocBridge = {
	/** The last committed document; a drag still under way is not in it */
	getDoc: () => CanvasDoc;
	/**
	 * Replaces the document wholesale. When the UI holds it this counts as a user
	 * edit (draft saving, the dirty marker), so the caller must always pass a new
	 * object
	 */
	replaceDoc: (doc: CanvasDoc) => void;
};
