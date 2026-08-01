import type { CanvasEvent } from "../../registry/GestureHandlerTypes";

/**
 * Routing policy (#110, #159): per-target handlers own only left-button tap and
 * drag interactions. Middle/right buttons and touch long presses fall through to
 * CanvasEventHandler's canvas-level pan / context-menu behavior.
 *
 * This predicate is the single source of that policy. Every per-target
 * handler's supports() gates on it, so a future change — e.g. allowing a
 * pen/touch auxiliary button — happens in one place and cannot silently skip a
 * surface and reintroduce the #110 bug
 * (right-click executing a command). The routing-exclusivity test pins that
 * every handler stays mutually exclusive under this policy.
 */
export const isPerTargetInteraction = (event: CanvasEvent): boolean =>
	event.button === 0 && event.type !== "longPress";
