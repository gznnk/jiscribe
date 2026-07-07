import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";

/**
 * GestureHandler that processes clicks on context menu items.
 * Handles events with targetKind "menu" and targetId "context-menu".
 *
 * targetPart format:
 * - `command:{commandId}` → execute the command and close the menu
 */
export const ContextMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		// Left button only: other buttons fall through to CanvasEventHandler's
		// canvas-level middle/right-button behavior (#110, #159)
		return (
			event.button === 0 &&
			event.targetKind === "menu" &&
			event.targetId === "context-menu"
		);
	},

	handle(state, event) {
		if (event.type === "click" && event.targetPart?.startsWith("command:")) {
			const commandId = event.targetPart.slice("command:".length);

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
