import { parseMenuPart } from "./utils/menuParts";
import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler for the properties sidebar's own chrome.
 * Handles events with targetKind "menu" and targetId "property-panel".
 *
 * targetPart format (built and parsed by utils/menuParts.ts):
 * - `command:{commandId}` → execute the command (the close button is
 *   `command:togglePropertyPanel`, the same route as the toolbar's toggle).
 * - `toggle:{sectionId}` → collapse that section, or expand it when already
 *   collapsed (click acts as a toggle), the way the shape library's own section
 *   headers do.
 *
 * The controls inside the sections carry their own targetId ("object-menu"), so
 * a property change routes to ObjectMenuHandler exactly as it does from the
 * floating menu. Everything else in the panel — the background, the header, the
 * padding around a section — lands here with no part and does only the light
 * dismiss the toolbar does: a press closes the context menu and any open
 * category flyout, and leaves the selection alone. The panel is persistent
 * chrome, so a press on it never closes the panel.
 */
export const PropertyPanelHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === "property-panel" &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event, registries) {
		let nextState = state;

		if (event.type === "pressed") {
			nextState = {
				...nextState,
				contextMenuPosition: null,
				stencilLibraryOpenCategory: null,
			};
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		const part = parseMenuPart(event.targetPart);
		if (!isActivation || part === null) {
			return nextState;
		}

		if (part.kind === "command") {
			return handleCommand(nextState, part.commandId, registries);
		}

		if (part.kind === "toggle") {
			const sectionId = part.id;
			const collapsedIds = nextState.propertyPanel.collapsedSectionIds;
			return {
				...nextState,
				propertyPanel: {
					...nextState.propertyPanel,
					collapsedSectionIds: collapsedIds.includes(sectionId)
						? collapsedIds.filter((id) => id !== sectionId)
						: [...collapsedIds, sectionId],
				},
			};
		}

		return nextState;
	},
};
