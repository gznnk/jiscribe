import { parseMenuAction } from "./utils/menuActions";
import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler that processes interactions on the top toolbar and the bottom
 * tool bar.
 * Handles events with targetKind "menu" and targetId "toolbar" or
 * "bottom-toolbar". Only the bar element carries those attributes; its buttons
 * carry just data-action and resolve their kind/id through closest(), so a press
 * on the bar's empty area (or on the bottom bar's placeholder "Other shapes"
 * button, which carries no action) arrives here with no targetAction and only
 * dismisses the open menus. The bottom bar's presets carry their own
 * `stencil-library` target and never reach here.
 *
 * targetAction format:
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
export const ToolbarHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			(event.targetId === "toolbar" || event.targetId === "bottom-toolbar") &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event, registries) {
		let nextState = state;

		// Close the context menu and any open category flyout on a press over
		// either bar — its buttons and its empty area alike.
		if (event.type === "pressed") {
			nextState = {
				...nextState,
				contextMenuPosition: null,
				stencilLibraryOpenCategory: null,
			};
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		const action = parseMenuAction(event.targetAction);
		if (isActivation && action?.kind === "command") {
			return handleCommand(nextState, action.commandId, registries);
		}

		return nextState;
	},
};
