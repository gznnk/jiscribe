import { closeStencilPopups } from "../../../utils/closeStencilPopups";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";
import { OTHER_SHAPES_POPOVER_TARGET_ID } from "./utils/otherShapesTargetIds";

/**
 * GestureHandler for the shape library's own chrome, in the sidebar and in the
 * bottom tool bar's "Other shapes" popover alike. Handles events with
 * targetKind "menu" and targetId "stencil-library-panel" (the sidebar) or
 * "other-shapes-popover".
 *
 * targetAction format:
 * - `section:{sectionId}` → collapse that section, or expand it when already
 *   collapsed (click acts as a toggle). The two share the one fold state.
 * - `close` → close the sidebar (only its header has the button).
 *
 * The stencil items inside the panel or the popover carry their own targetId
 * ("stencil-library"), so click-to-draw and drag-to-place still route to
 * StencilLibraryItemHandler untouched. Everything else in either — the
 * background, the sidebar's header, the padding around a section — lands here
 * and does only the light dismiss the toolbar does: a press closes the context
 * menu and any open category flyout, and leaves the selection alone. The panel itself is
 * persistent chrome, so a press on it never closes the panel; nor does a press
 * inside the popover close the popover.
 */
const SECTION_PREFIX = "section:";
const CLOSE_ACTION = "close";
const SIDEBAR_TARGET_ID = "stencil-library-panel";

export const StencilLibraryPanelHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			(event.targetId === SIDEBAR_TARGET_ID ||
				event.targetId === OTHER_SHAPES_POPOVER_TARGET_ID) &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event) {
		let nextState = state;

		if (event.type === "pressed") {
			nextState = {
				...nextState,
				contextMenuPosition: null,
				// A press inside the popover keeps it open.
				...(event.targetId === OTHER_SHAPES_POPOVER_TARGET_ID
					? { stencilLibraryOpenCategory: null }
					: closeStencilPopups()),
			};
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		if (!isActivation || event.targetAction === undefined) {
			return nextState;
		}

		if (event.targetAction === CLOSE_ACTION) {
			return {
				...nextState,
				stencilLibraryPanel: {
					...nextState.stencilLibraryPanel,
					isOpen: false,
				},
			};
		}

		if (event.targetAction.startsWith(SECTION_PREFIX)) {
			const sectionId = event.targetAction.slice(SECTION_PREFIX.length);
			const collapsedIds = nextState.stencilLibraryPanel.collapsedSectionIds;
			return {
				...nextState,
				stencilLibraryPanel: {
					...nextState.stencilLibraryPanel,
					collapsedSectionIds: collapsedIds.includes(sectionId)
						? collapsedIds.filter((id) => id !== sectionId)
						: [...collapsedIds, sectionId],
				},
			};
		}

		return nextState;
	},
};
