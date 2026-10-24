import { commitTextEditIntoDragSnapshot } from "./commitTextEditIntoDragSnapshot";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { CanvasEvent } from "../../registry/GestureHandlerTypes";

/**
 * Commits an open text edit, except on a touch press. A touch "pressed" may
 * still become a pinch (a second finger converts the press into viewport
 * navigation), and navigation must not end an active text edit — the same
 * invariant CanvasEventHandler keeps for background touches. The interaction
 * that resolves the press re-enters the handler as click / doubleClick or as a
 * dragStart, which commit here; a dragStart's commit goes into the drag's start
 * snapshot too (commitTextEditIntoDragSnapshot). Mouse/pen presses commit
 * immediately.
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
		: commitTextEditIntoDragSnapshot(state);
