import { parseMenuAction } from "./utils/menuActions";
import { handleCommand } from "../../../commands/handlers/handleCommand";
import { closeStencilPopups } from "../../../utils/closeStencilPopups";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler that processes interactions on the top toolbar and the stencil
 * bar. Handles events with targetKind "menu" and targetId "toolbar" or
 * "stencil-bar". Only the bar element carries those attributes (each of the
 * two pills, while the top bar is collapsed); its buttons carry just
 * data-action and resolve their kind/id through closest(), so a press on the
 * bar's empty area arrives here with no targetAction and only dismisses the
 * open menus, the Other shapes popover among them. The stencil bar's presets
 * carry their own `stencil-library` target and its "Other shapes" button its
 * own `other-shapes-button` (OtherShapesToggleHandler), so neither reaches here.
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
			(event.targetId === "toolbar" || event.targetId === "stencil-bar") &&
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
				...closeStencilPopups(),
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
