import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler for the shape library sidebar's own chrome.
 * Handles events with targetKind "menu" and targetId "stencil-library-panel".
 *
 * targetPart format:
 * - `section:{sectionId}` → collapse that section, or expand it when already
 *   collapsed (click acts as a toggle).
 * - `close` → close the panel.
 *
 * The stencil items inside the panel carry their own targetId
 * ("stencil-library"), so click-to-draw and drag-to-place still route to
 * StencilLibraryItemHandler untouched. Everything else in the panel — the
 * background, the header, the padding around a section — lands here and does
 * only the light dismiss the toolbar does: a press closes the context menu and
 * any open category flyout, and leaves the selection alone. The panel itself is
 * persistent chrome, so a press on it never closes the panel.
 */
const SECTION_PREFIX = "section:";
const CLOSE_PART = "close";

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
			nextState = {
				...nextState,
				contextMenuPosition: null,
				stencilLibraryOpenCategory: null,
			};
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		if (!isActivation || event.targetPart === undefined) {
			return nextState;
		}

		if (event.targetPart === CLOSE_PART) {
			return {
				...nextState,
				stencilLibraryPanel: {
					...nextState.stencilLibraryPanel,
					isOpen: false,
				},
			};
		}

		if (event.targetPart.startsWith(SECTION_PREFIX)) {
			const sectionId = event.targetPart.slice(SECTION_PREFIX.length);
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
