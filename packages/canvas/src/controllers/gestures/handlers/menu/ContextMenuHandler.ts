import { parseMenuAction } from "./utils/menuActions";
import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler that processes clicks on context menu items.
 * Handles events with targetKind "menu" and targetId "context-menu".
 *
 * targetAction format:
 * - `command:{commandId}` → execute the command and close the menu
 */
export const ContextMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === "context-menu" &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event, registries) {
		const action = parseMenuAction(event.targetAction);
		if (event.type === "click" && action?.kind === "command") {
			// Execute the COMMAND action
			const nextState = handleCommand(state, action.commandId, registries);

			// Close the context menu
			return {
				...nextState,
				contextMenuPosition: null,
			};
		}

		return state;
	},
};
