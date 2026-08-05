import type { CanvasControllerState } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type { CanvasEvent } from "../../registry/GestureHandlerTypes";

/**
 * commitTextEditIfNeeded, deferred for a touch press. A touch "pressed" may
 * still become a pinch (a second finger converts the press into viewport
 * navigation), and navigation must not end an active text edit — the same
 * invariant CanvasEventHandler keeps for background touches. The interaction
 * that resolves the press re-enters the handler as click / doubleClick /
 * dragStart, all of which commit here. Mouse/pen presses commit immediately,
 * as before.
 *
 * @param state - Current controller state; returned as-is when the commit is
 *   deferred or no edit is active.
 * @param event - The routed event; only pointerType and type are consulted.
 */
export const commitTextEditUnlessTouchPress = (
	state: CanvasControllerState,
	event: CanvasEvent,
): CanvasControllerState =>
	event.pointerType === "touch" && event.type === "pressed"
		? state
		: commitTextEditIfNeeded(state);
