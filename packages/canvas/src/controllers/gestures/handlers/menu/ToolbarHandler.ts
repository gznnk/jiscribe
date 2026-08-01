import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler that processes button interactions on the top toolbar.
 * Handles events with targetKind "menu" and targetId "toolbar".
 *
 * targetPart format:
 * - `command:{commandId}` → execute the command (canExecute is judged inside handleCommand)
 *
 * Actions (zoom, etc.) are consolidated into the command system and go through the same
 * path (handleCommand) as keyboard shortcuts and the context menu.
 *
 * Note that click and doubleClick are treated equivalently.
 * GestureRecognizer fires click / doubleClick exclusively (rapidly clicking the same spot
 * within DOUBLE_CLICK_THRESHOLD makes the second one doubleClick). Repeat toolbar
 * commands (zoom ±, etc.) have no double-click-specific meaning, so doubleClick is also
 * treated as a single execution. This makes "rapid clicking = execute every time" hold.
 */
const COMMAND_PREFIX = "command:";

export const ToolbarHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === "toolbar" &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event, registries) {
		let nextState = state;

		// Close the context menu on a press over the toolbar
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		if (isActivation && event.targetPart?.startsWith(COMMAND_PREFIX)) {
			const commandId = event.targetPart.slice(COMMAND_PREFIX.length);
			return handleCommand(nextState, commandId, registries);
		}

		return nextState;
	},
};
