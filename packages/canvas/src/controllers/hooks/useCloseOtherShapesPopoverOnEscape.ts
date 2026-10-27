import { type Dispatch, type RefObject, useEffect } from "react";

import type { CanvasAction } from "../reducer/CanvasActions";

/**
 * While the bottom tool bar's Other shapes popover is open, makes Escape close
 * it and do nothing else, from wherever focus is inside the canvas root. No
 * text editor is open beside the popover (starting an edit closes it through
 * closeStencilPopups, and opening it commits an edit), so the key is never an
 * editor's. An Escape that ends an IME composition is left to the field.
 *
 * Taken in the capture phase on the canvas root, ahead of useKeyboardShortcuts'
 * listener on the same element, and stopped there, so EscapeSelectionCommand
 * never sees the key and the selection stays as it was (the way ModalShell
 * keeps Escape to itself). Scoped to the root rather than `document`, so with
 * several canvases on a page only the focused one's popover closes.
 *
 * @param rootRef - The focusable canvas root useKeyboardShortcuts listens on;
 *   nothing is attached while it is null (before mount)
 * @param isOpen - `isOtherShapesPopoverOpen`; the listener exists only while true
 * @param dispatch - Receives CLOSE_OTHER_SHAPES_POPOVER
 */
export function useCloseOtherShapesPopoverOnEscape(
	rootRef: RefObject<HTMLElement | null>,
	isOpen: boolean,
	dispatch: Dispatch<CanvasAction>,
): void {
	useEffect(() => {
		const root = rootRef.current;
		if (!root || !isOpen) {
			return;
		}

		const onRootKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.isComposing) {
				return;
			}
			event.preventDefault();
			// Immediate: with focus on the root itself both listeners sit on the
			// target, where a plain stopPropagation would not keep the other one off.
			event.stopImmediatePropagation();
			dispatch({ type: "CLOSE_OTHER_SHAPES_POPOVER" });
		};

		root.addEventListener("keydown", onRootKeyDown, true);
		return () => {
			root.removeEventListener("keydown", onRootKeyDown, true);
		};
	}, [rootRef, isOpen, dispatch]);
}
