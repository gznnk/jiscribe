import { parseMenuAction } from "./utils/menuActions";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { claimDrag } from "../../../utils/claimDrag";
import {
	calcPinInsertionIndex,
	movePinnedCategory,
} from "../../../utils/pinnedCategoryOrder";
import { toggleStencilPanelContent } from "../../../utils/stencilPanelContent";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler for the category buttons on the stencil rail, and the rows of
 * the rail's "…" popover, which stand for the same categories.
 * Handles events with targetKind "menu" and targetId "stencil-category".
 *
 * targetAction format: `toggle:{categoryId}` → show that category's presets
 * (toggleStencilPanelContent): in the flyout over the canvas, or in the docked
 * panel while that is open; pressed again while it is shown, the panel showing
 * it closes.
 *
 * A drag of a pinned category moves it in the pin order (a `"pinReorder"`
 * drag): each frame reads the category under the pointer — a rail button or a
 * popover row alike, both being this target — into the insertion index
 * (calcPinInsertionIndex), and dragEnd moves the pin there. A press that does
 * not travel past the recognizer's drag threshold stays a click and toggles as
 * above; a drag of a category that is not pinned changes nothing.
 *
 * This handler only owns the toggle itself. Dismissal of the flyout on outside
 * interactions is handled by the selection/press handlers and commands that
 * clear stencilFlyout (and resetUiState for bulk resets) — there is no central
 * clear in handleGesture. Most of them clear objectMenuOpenId in the same
 * breath; ToolbarHandler and StencilRailHandler are the exceptions, closing only
 * the flyout since a press on the chrome is not meant to dismiss the ObjectMenu.
 */
/**
 * One frame of a pin drag: the insertion index for the category under the
 * pointer. Over anything else (a gap, a category that is not pinned) the last
 * index is kept, so crossing the gap between two buttons does not drop it.
 */
const trackPinInsertion = (
	state: CanvasControllerState,
	event: CanvasEvent,
): CanvasControllerState => {
	const drag = state.drag;
	if (drag?.kind !== "pinReorder") {
		return state;
	}
	const hoveredAction = event
		.getHovered()
		.find(
			(hovered) => hovered.kind === "menu" && hovered.id === "stencil-category",
		)?.action;
	const hovered = parseMenuAction(hoveredAction);
	if (
		hovered?.kind !== "toggle" ||
		!state.pinnedCategoryIds.includes(hovered.id)
	) {
		return state;
	}
	const insertionIndex = calcPinInsertionIndex(
		state.pinnedCategoryIds,
		drag.categoryId,
		hovered.id,
	);
	return insertionIndex === drag.insertionIndex
		? state
		: { ...state, drag: { ...drag, insertionIndex } };
};

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

		switch (event.type) {
			case "dragStart":
				return action?.kind === "toggle" &&
					nextState.pinnedCategoryIds.includes(action.id)
					? claimDrag(
							nextState,
							{
								kind: "pinReorder",
								categoryId: action.id,
								insertionIndex: null,
							},
							{ edgeScroll: false },
						)
					: nextState;
			case "drag":
				return trackPinInsertion(nextState, event);
			case "dragEnd": {
				const drag = nextState.drag;
				if (drag?.kind !== "pinReorder" || drag.insertionIndex === null) {
					return nextState;
				}
				return {
					...nextState,
					pinnedCategoryIds: movePinnedCategory(
						nextState.pinnedCategoryIds,
						drag.categoryId,
						drag.insertionIndex,
					),
				};
			}
			default:
				return nextState;
		}
	},
};
