import { parseMenuPart } from "./utils/menuParts";
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
 * targetPart format:
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
		const part = parseMenuPart(event.targetPart);
		if (event.type === "click" && part?.kind === "command") {
			// Execute the COMMAND action
			const nextState = handleCommand(state, part.commandId, registries);

			// Close the context menu
			return {
				...nextState,
				contextMenuPosition: null,
			};
		}

		return state;
	},
};
