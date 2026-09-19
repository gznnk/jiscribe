import type { CanvasControllerState } from "../../../../CanvasTypes";

/**
 * Whether the state alone withholds the ObjectMenu, leaving out the timing-based
 * reasons (`useObjectMenuPosition` adds those, plus the case where the selection
 * has no measurable extent).
 *
 * The comment panel is normally the menu's dropdown, and a comment marker can be
 * pressed in states where the menu is not there to hold it — so the marker layer
 * asks this the same question the hook does and draws the panel itself when the
 * answer is yes (CommentMarkerLayer).
 *
 * @param state - The selection, the context menu, the text-edit session, the area
 *   selection and the properties sidebar are read; nothing that changes per frame is
 * @returns true while the menu must not be drawn
 */
export const isObjectMenuSuppressed = (
	state: CanvasControllerState,
): boolean => {
	const hasSelection =
		state.selectedIds.length > 0 || state.selectedConnectorId !== null;
	if (!hasSelection) {
		return true;
	}
	if (state.contextMenuPosition !== null) {
		return true;
	}
	// A shape's text editor keeps the menu: its text items are how a stretch of
	// the text being edited is styled (TextSlotStyleProperty), and the menu is
	// the only place the color and the size of one live. The menu itself never
	// commits the edit — ObjectMenuHandler runs no commit, and the press does
	// not even move the focus off the editing surface (ObjectMenu) — so the session
	// survives a menu interaction instead of being left dangling (U6).
	// A connector label is still hidden: it is one text with one styling, so
	// there is nothing the menu could do mid-edit that it cannot do after.
	if (state.textEditState !== null && state.textEditState.kind !== "shape") {
		return true;
	}
	if (state.areaSelection !== null) {
		return true;
	}
	// The properties sidebar states everything the menu does, so while it is
	// open the menu would only duplicate it and cover the drawing beside the
	// selection.
	if (state.propertyPanel.isOpen) {
		return true;
	}
	return false;
};
