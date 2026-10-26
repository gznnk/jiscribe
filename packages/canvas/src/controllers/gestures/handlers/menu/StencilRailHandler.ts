import { parseMenuAction } from "./utils/menuActions";
import { handleCommand } from "../../../commands/handlers/handleCommand";
import { isStencilRailPopoverKind } from "../../../utils/stencilRailPopover";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * GestureHandler for the stencil rail on the left of the canvas.
 * Handles events with targetKind "menu" and targetId "stencil-rail" (the rail
 * element) or "stencil-rail-popover" (a popover the rail opens beside itself).
 * A press on the rail's empty area arrives here with no targetAction. Its
 * presets ("stencil-library") and category buttons and popover rows
 * ("stencil-category") carry their own targetId and never reach here.
 *
 * targetAction format:
 * - `command:{commandId}` → execute the command (the catalog button's
 *   `toggleStencilLibrary`; canExecute is judged inside handleCommand)
 * - `toggle:{popoverKind}` → open the rail popover of that kind in the flyout's
 *   slot, or close it when it is the one open (the "…" button, the collapsed
 *   presets button)
 *
 * A press on a popover's own background only closes the context menu: it is
 * inside what is open, as a press inside the flyout is.
 * A press on the empty area closes the context menu and the stencil flyout, as
 * one on the toolbar's does. A press on a button closes only the context menu:
 * the catalog button's own click decides about the flyout, and closing it on the
 * press first would have that click open it again.
 */
export const StencilRailHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			(event.targetId === "stencil-rail" ||
				event.targetId === "stencil-rail-popover") &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event, registries) {
		let nextState = state;

		if (event.type === "pressed") {
			nextState =
				event.targetAction === undefined && event.targetId === "stencil-rail"
					? { ...nextState, contextMenuPosition: null, stencilFlyout: null }
					: { ...nextState, contextMenuPosition: null };
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		const action = parseMenuAction(event.targetAction);
		if (isActivation && action?.kind === "command") {
			return handleCommand(nextState, action.commandId, registries);
		}
		if (
			isActivation &&
			action?.kind === "toggle" &&
			isStencilRailPopoverKind(action.id)
		) {
			return {
				...nextState,
				stencilFlyout:
					nextState.stencilFlyout?.kind === action.id
						? null
						: { kind: action.id },
			};
		}

		return nextState;
	},
};
