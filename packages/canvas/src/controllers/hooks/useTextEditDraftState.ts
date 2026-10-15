import { useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";

type TextEditState = CanvasControllerState["textEditState"];

/**
 * `textEditState` held through the dispatches that only move the editor's caret
 * or selection (UPDATE_TEXT_EDIT_SELECTION, one per keystroke on top of the
 * text's own), for memos that read the session and its draft but not where the
 * caret is: grafting the draft onto the edited object rebuilds its slots and
 * every layout cache keyed on them, which a caret move must not pay for.
 *
 * @param textEditState - The state's `textEditState`
 * @returns `textEditState` itself whenever the session opens, closes, changes kind or its draft text is replaced; otherwise the one returned last time, whose `selection` may lag the caret — read that off the state, not off this
 */
export const useTextEditDraftState = (
	textEditState: TextEditState,
): TextEditState => {
	const heldRef = useRef(textEditState);
	const held = heldRef.current;
	const isSameDraft =
		held !== null &&
		textEditState !== null &&
		held.kind === textEditState.kind &&
		held.text === textEditState.text;
	// Held during render rather than in an effect: the memos reading it run in the
	// same render.
	if (!isSameDraft) {
		heldRef.current = textEditState;
	}
	return heldRef.current;
};
