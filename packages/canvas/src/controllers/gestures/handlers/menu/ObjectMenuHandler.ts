import { applyStylePropertyPart } from "./utils/applyStylePropertyPart";
import { parseMenuPart } from "./utils/menuParts";
import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler that processes ObjectMenu item interactions.
 * Handles events with targetKind "menu" and targetId "object-menu": the menu's
 * container carries the pair, and the items inside it carry only a data-part.
 *
 * Events handled:
 * - click / doubleClick: menu item activation (equivalent; see
 *   applyStylePropertyPart), or a commit of the slider value the native track
 *   click already produced
 * - pressed / dragStart / drag: real-time slider update (no history recording)
 * - dragEnd: commit the slider's final value + record history
 *
 * targetPart formats (absent = the menu chrome itself, e.g. bar / panel background;
 * built and parsed by utils/menuParts.ts):
 * - `toggle:{sectionId}` → toggle a section open/closed
 * - `set:{property}:{value}` / `slider:{property}` → write a style property of
 *   the selection (applyStylePropertyPart, shared with PropertyPanelHandler)
 * - `command:{commandId}` → execute a command
 */
export const ObjectMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === "object-menu" &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event, registries) {
		let nextState = state;

		// A press on the ObjectMenu closes the context menu (the press itself performs no item action)
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		const part = parseMenuPart(event.targetPart);

		const styledState = applyStylePropertyPart(
			nextState,
			event,
			part,
			registries,
		);
		if (styledState !== null) {
			return styledState;
		}

		// doubleClick activates like click, for the reason given in applyStylePropertyPart
		if (event.type !== "click" && event.type !== "doubleClick") {
			return nextState;
		}

		if (part?.kind === "toggle") {
			const sectionId = part.id;
			return {
				...nextState,
				objectMenuOpenId:
					nextState.objectMenuOpenId === sectionId ? null : sectionId,
			};
		}

		if (part?.kind === "command") {
			return handleCommand(nextState, part.commandId, registries);
		}

		return nextState;
	},
};
