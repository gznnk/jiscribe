import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isLeftButton } from "../utils/isLeftButton";

/**
 * GestureHandler for the StencilLibrary category toggle buttons in the toolbar.
 * Handles events with targetKind "menu" and targetId "stencil-category".
 *
 * targetPart format: `toggle:{categoryId}` → open that category's flyout, or
 * close it if it is already the open one (click acts as a toggle).
 *
 * This handler only owns the toggle itself. Dismissal on outside interactions
 * is handled by the selection/press handlers and commands that clear
 * stencilLibraryOpenCategory (and resetUiState for bulk resets), mirroring how
 * objectMenuOpenId is cleared — there is no central clear in handleGesture.
 */
const TOGGLE_PREFIX = "toggle:";

export const StencilCategoryToggleHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === "stencil-category" &&
			isLeftButton(event)
		);
	},

	handle(state, event) {
		let nextState = state;

		// Close the context menu on a press over the toggle (parity with the other menus).
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		if (isActivation && event.targetPart?.startsWith(TOGGLE_PREFIX)) {
			const categoryId = event.targetPart.slice(TOGGLE_PREFIX.length);
			return {
				...nextState,
				stencilLibraryOpenCategory:
					nextState.stencilLibraryOpenCategory === categoryId
						? null
						: categoryId,
			};
		}

		return nextState;
	},
};
