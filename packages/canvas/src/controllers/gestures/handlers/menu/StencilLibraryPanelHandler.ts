import { parseMenuAction } from "./utils/menuActions";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { isStencilPanelContent } from "../../../utils/stencilPanelContent";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/** Pins a library category to the end of the rail, or takes it off when pinned. */
const togglePinnedCategory = (
	state: CanvasControllerState,
	categoryId: string,
): CanvasControllerState => ({
	...state,
	pinnedCategoryIds: state.pinnedCategoryIds.includes(categoryId)
		? state.pinnedCategoryIds.filter((pinnedId) => pinnedId !== categoryId)
		: [...state.pinnedCategoryIds, categoryId],
});

/**
 * GestureHandler for the chrome of the two stencil panels: the flyout over the
 * canvas and the docked panel beside it.
 * Handles events with targetKind "menu" and targetId "stencil-library-panel".
 *
 * targetAction format (built with menuActions):
 * - `dock` → the flyout becomes the docked panel, showing what it showed.
 * - `undock` → the docked panel becomes the flyout, showing what it showed.
 * - `close` → close whichever of the two is open (they never coexist).
 * - `show:{categoryId}` → the open panel switches to that category (a catalog row).
 * - `pin:{categoryId}` → pin that category to the rail, or unpin it.
 *
 * The stencil items inside the panels carry their own targetId
 * ("stencil-library"), so click-to-draw and drag-to-place still route to
 * StencilLibraryItemHandler untouched, which is also what closes the flyout once
 * a preset is picked. Everything else in a panel — the background, the header,
 * the padding — lands here and only closes the context menu: a press inside the
 * flyout must not close it, and the docked panel is persistent chrome.
 */
export const StencilLibraryPanelHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === "stencil-library-panel" &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event) {
		let nextState = state;

		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		const action = parseMenuAction(event.targetAction);
		if (!isActivation || action === null) {
			return nextState;
		}

		switch (action.kind) {
			case "dock":
				// A rail popover in the slot has no dock button to arrive from.
				return nextState.stencilFlyout === null ||
					!isStencilPanelContent(nextState.stencilFlyout)
					? nextState
					: {
							...nextState,
							stencilFlyout: null,
							stencilLibraryPanel: {
								isOpen: true,
								content: nextState.stencilFlyout,
							},
						};
			case "undock":
				return nextState.stencilLibraryPanel.isOpen
					? {
							...nextState,
							stencilFlyout: nextState.stencilLibraryPanel.content,
							stencilLibraryPanel: {
								...nextState.stencilLibraryPanel,
								isOpen: false,
							},
						}
					: nextState;
			case "close":
				return {
					...nextState,
					stencilFlyout: null,
					stencilLibraryPanel: {
						...nextState.stencilLibraryPanel,
						isOpen: false,
					},
				};
			case "show": {
				const content = {
					kind: "category",
					categoryId: action.categoryId,
				} as const;
				if (nextState.stencilLibraryPanel.isOpen) {
					return {
						...nextState,
						stencilLibraryPanel: { isOpen: true, content },
					};
				}
				return nextState.stencilFlyout === null
					? nextState
					: { ...nextState, stencilFlyout: content };
			}
			case "pin":
				return togglePinnedCategory(nextState, action.categoryId);
			default:
				return nextState;
		}
	},
};
