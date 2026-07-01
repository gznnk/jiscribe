import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";

/**
 * GestureHandler that processes clicks on context menu items.
 * Handles events whose targetKind is "context-menu".
 */
export const ContextMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return event.targetKind === "context-menu";
	},

	handle(state, event) {
		if (event.type === "click" && event.targetId) {
			// Strip the "context-menu:" prefix from targetId to get the command ID
			const commandId = event.targetId.replace("context-menu:", "");

			// Execute the COMMAND action
			const nextState = handleCommand(state, commandId);

			// Close the context menu
			return {
				...nextState,
				contextMenuPosition: null,
			};
		}

		return state;
	},
};
