import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isLeftButton } from "../utils/isLeftButton";

/**
 * GestureHandler that processes clicks on context menu items.
 * Handles events with targetKind "menu" and targetId "context-menu".
 *
 * targetPart format:
 * - `command:{commandId}` → execute the command and close the menu
 */
export const ContextMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === "context-menu" &&
			isLeftButton(event)
		);
	},

	handle(state, event, registries) {
		if (event.type === "click" && event.targetPart?.startsWith("command:")) {
			const commandId = event.targetPart.slice("command:".length);

			// Execute the COMMAND action
			const nextState = handleCommand(state, commandId, registries);

			// Close the context menu
			return {
				...nextState,
				contextMenuPosition: null,
			};
		}

		return state;
	},
};
