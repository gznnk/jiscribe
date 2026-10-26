import { parseMenuAction } from "./utils/menuActions";
import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler for the stencil rail on the left of the canvas.
 * Handles events with targetKind "menu" and targetId "stencil-rail". Only the
 * rail element carries those attributes, so a press on its empty area arrives
 * here with no targetAction. Its presets ("stencil-library") and category
 * buttons ("stencil-category") carry their own targetId and never reach here.
 *
 * targetAction format:
 * - `command:{commandId}` → execute the command (the catalog button's
 *   `toggleStencilLibrary`; canExecute is judged inside handleCommand)
 *
 * A press on the empty area closes the context menu and the stencil flyout, as
 * one on the toolbar's does. A press on a button closes only the context menu:
 * the catalog button's own click decides about the flyout, and closing it on the
 * press first would have that click open it again.
 */
export const StencilRailHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === "stencil-rail" &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event, registries) {
		let nextState = state;

		if (event.type === "pressed") {
			nextState =
				event.targetAction === undefined
					? { ...nextState, contextMenuPosition: null, stencilFlyout: null }
					: { ...nextState, contextMenuPosition: null };
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		const action = parseMenuAction(event.targetAction);
		if (isActivation && action?.kind === "command") {
			return handleCommand(nextState, action.commandId, registries);
		}

		return nextState;
	},
};
