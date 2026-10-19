import { applyStyleAction } from "./utils/applyStyleAction";
import { parseMenuAction } from "./utils/menuActions";
import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler that processes ObjectMenu item interactions.
 * Handles events with targetKind "menu" and targetId "object-menu": the menu's
 * container carries the pair, and the items inside it carry only a data-action.
 *
 * Events handled:
 * - click / doubleClick: menu item activation (equivalent; see
 *   applyStyleAction), or a commit of the slider value the native track
 *   click already produced
 * - pressed / dragStart / drag: real-time slider update (no history recording)
 * - dragEnd: commit the slider's final value + record history
 *
 * targetAction formats (absent = the menu chrome itself, e.g. bar / panel background;
 * built and parsed by utils/menuActions.ts):
 * - `toggle:{sectionId}` → toggle a section open/closed
 * - `set:{property}:{value}` / `slider:{property}` → write a style property of
 *   the selection (applyStyleAction, shared with PropertyPanelHandler)
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

		const action = parseMenuAction(event.targetAction);

		const styledState = applyStyleAction(nextState, event, action, registries);
		if (styledState !== null) {
			return styledState;
		}

		// doubleClick activates like click, for the reason given in applyStyleAction
		if (event.type !== "click" && event.type !== "doubleClick") {
			return nextState;
		}

		if (action?.kind === "toggle") {
			const sectionId = action.id;
			return {
				...nextState,
				objectMenuOpenId:
					nextState.objectMenuOpenId === sectionId ? null : sectionId,
			};
		}

		if (action?.kind === "command") {
			return handleCommand(nextState, action.commandId, registries);
		}

		return nextState;
	},
};
