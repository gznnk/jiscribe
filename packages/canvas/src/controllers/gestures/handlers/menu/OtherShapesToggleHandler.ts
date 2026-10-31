import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";
import { OTHER_SHAPES_BUTTON_TARGET_ID } from "./utils/otherShapesTargetIds";

/**
 * GestureHandler for the stencil bar's "Other shapes" button.
 * Handles events with targetKind "menu" and targetId "other-shapes-button".
 *
 * A click (or doubleClick, as on the toolbar) opens the popover, committing an
 * open text edit first, or closes it when open. The button is a target of its own rather than an action under the
 * bar's: a press on the bar is a press outside the popover and closes it
 * (ToolbarHandler), so the click that followed would only open it again.
 *
 * A press closes the context menu and the category flyout, as one on the bar
 * does, and leaves the popover alone. A drag off the button is a `"menu"`
 * drag that does nothing.
 */
export const OtherShapesToggleHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === OTHER_SHAPES_BUTTON_TARGET_ID &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event) {
		if (event.type === "pressed") {
			return {
				...state,
				contextMenuPosition: null,
				stencilLibraryOpenCategory: null,
			};
		}

		if (event.type === "click" || event.type === "doubleClick") {
			// Opening writes back an open text edit first, as arming a preset does
			// (StencilLibraryItemHandler): the popover never shows beside an editor.
			const committed = state.isOtherShapesPopoverOpen
				? state
				: commitTextEditIfNeeded(state);
			return {
				...committed,
				isOtherShapesPopoverOpen: !state.isOtherShapesPopoverOpen,
			};
		}

		return state;
	},
};
