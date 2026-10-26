import { parseMenuAction } from "./utils/menuActions";
import { toggleStencilPanelContent } from "../../../utils/stencilPanelContent";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler for the category buttons on the stencil rail.
 * Handles events with targetKind "menu" and targetId "stencil-category".
 *
 * targetAction format: `toggle:{categoryId}` → show that category's presets
 * (toggleStencilPanelContent): in the flyout over the canvas, or in the docked
 * panel while that is open; pressed again while it is shown, the panel showing
 * it closes.
 *
 * This handler only owns the toggle itself. Dismissal of the flyout on outside
 * interactions is handled by the selection/press handlers and commands that
 * clear stencilFlyout (and resetUiState for bulk resets) — there is no central
 * clear in handleGesture. Most of them clear objectMenuOpenId in the same
 * breath; ToolbarHandler and StencilRailHandler are the exceptions, closing only
 * the flyout since a press on the chrome is not meant to dismiss the ObjectMenu.
 */
export const StencilCategoryToggleHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === "stencil-category" &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event) {
		let nextState = state;

		// Close the context menu on a press over the toggle (parity with the other menus).
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		const action = parseMenuAction(event.targetAction);
		if (isActivation && action?.kind === "toggle") {
			return toggleStencilPanelContent(nextState, {
				kind: "category",
				categoryId: action.id,
			});
		}

		return nextState;
	},
};
