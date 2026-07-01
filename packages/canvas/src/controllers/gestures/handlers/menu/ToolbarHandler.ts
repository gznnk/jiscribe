import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";

/**
 * GestureHandler that processes button interactions on the top toolbar.
 * Handles events when targetKind is "toolbar".
 *
 * targetId format:
 * - `toolbar:command:{commandId}` → execute the command (canExecute is judged inside handleCommand)
 *
 * Actions (zoom, etc.) are consolidated into the command system and go through the same
 * path (handleCommand) as keyboard shortcuts and the context menu.
 *
 * Note that click and doubleClick are treated equivalently.
 * GestureRecognizer fires click / doubleClick exclusively (rapidly hitting the same target
 * within DOUBLE_CLICK_THRESHOLD makes the second and later ones doubleClick). Repeat toolbar
 * commands (zoom ±, etc.) have no double-click-specific meaning, so doubleClick is also
 * treated as a single execution. This makes "rapid clicking = execute every time" hold.
 */
const COMMAND_PREFIX = "toolbar:command:";

export const ToolbarHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return event.targetKind === "toolbar";
	},

	handle(state, event) {
		let nextState = state;

		// Close the context menu on a press over the toolbar
		if (event.type === "pressed") {
			if (event.button === 0) {
				nextState = { ...nextState, contextMenuPosition: null };
			}
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		if (isActivation && event.targetId?.startsWith(COMMAND_PREFIX)) {
			const commandId = event.targetId.slice(COMMAND_PREFIX.length);
			return handleCommand(nextState, commandId);
		}

		return nextState;
	},
};
