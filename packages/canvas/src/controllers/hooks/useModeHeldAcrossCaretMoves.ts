import { useRef } from "react";

import type { CanvasMode } from "../CanvasTypes";

/**
 * `mode` held through the dispatches that only move the editor's caret or
 * selection (UPDATE_TEXT_EDIT_SELECTION, one per keystroke on top of the text's
 * own), for memos that read the session and its draft but not where the caret
 * is: grafting the draft onto the edited object rebuilds its slots and every
 * layout cache keyed on them, which a caret move must not pay for.
 *
 * @param mode - The state's `mode`
 * @returns `mode` itself whenever a session opens, closes, changes kind or its draft text is replaced, and whenever no session is open; otherwise the one returned last time, whose draft `selection` may lag the caret — read that off the state, not off this
 */
export const useModeHeldAcrossCaretMoves = (mode: CanvasMode): CanvasMode => {
	const heldRef = useRef(mode);
	const held = heldRef.current;
	const isSameDraft =
		held.kind === "textEdit" &&
		mode.kind === "textEdit" &&
		held.draft.kind === mode.draft.kind &&
		held.draft.text === mode.draft.text;
	// Held during render rather than in an effect: the memos reading it run in the
	// same render.
	if (!isSameDraft) {
		heldRef.current = mode;
	}
	return heldRef.current;
};
