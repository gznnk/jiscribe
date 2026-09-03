// A history for rewinding the AI's edits one step at a time. It is a separate
// thing from the canvas's own undo (Ctrl+Z), and is there for the AI to take
// back its own last step and nothing else.
//
// A step may only be taken back while the document is still as the AI left it,
// so the document after the operation is remembered alongside it, and one that
// does not match the current document — meaning the user has touched it — is
// not rewound.

import type { CanvasDoc } from "@jiscribe/doc";

/** How many steps are kept; the oldest steps beyond this are dropped */
const MAX_HISTORY_DEPTH = 20;

export type CanvasOpHistory = {
	/**
	 * Remembers one step.
	 *
	 * @param before - The document before the operation; the very object undo
	 *   restores
	 * @param after - The document after the operation; used at undo time to check
	 *   that no user edit slipped in
	 */
	push: (before: CanvasDoc, after: CanvasDoc) => void;
	/**
	 * Takes the last step back out.
	 *
	 * @param currentDoc - The document being edited right now
	 * @returns The document to restore; null when there is no history, and when
	 *   the current document has changed from the one the AI last left (the user
	 *   edited it)
	 */
	pop: (currentDoc: CanvasDoc) => CanvasDoc | null;
	/** How many steps are left */
	depth: () => number;
};

/** Creates a history of AI operations; hold one per thing being edited (the chat panel's document, the file open for editing) */
export const createCanvasOpHistory = (): CanvasOpHistory => {
	const entries: { before: CanvasDoc; afterJson: string }[] = [];

	return {
		push: (before, after) => {
			entries.push({ before, afterJson: JSON.stringify(after) });
			if (entries.length > MAX_HISTORY_DEPTH) {
				entries.shift();
			}
		},
		pop: (currentDoc) => {
			const latest = entries[entries.length - 1];
			if (latest === undefined) {
				return null;
			}
			if (JSON.stringify(currentDoc) !== latest.afterJson) {
				return null;
			}
			entries.pop();
			return latest.before;
		},
		depth: () => entries.length,
	};
};
