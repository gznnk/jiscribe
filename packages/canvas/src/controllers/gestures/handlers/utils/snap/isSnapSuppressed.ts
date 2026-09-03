import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";

/**
 * Whether alignment snapping must stand down for this event. The single source
 * of that policy, shared by every findSnap call site.
 *
 * Ctrl is the user's explicit opt-out. scrollDelta marks a tick whose viewport
 * moved on its own (edge scroll, or a wheel turned mid-drag): the pointer can
 * sit still while the dragged shape sweeps past candidate lines, and snapping
 * would peg it to each one in turn while the view keeps scrolling out from
 * under it. Suppression lasts only for those ticks — dragEnd carries no
 * scrollDelta, so the released position snaps as usual.
 *
 * @param event - The drag tick being handled; only mods.ctrl and the presence
 *   of scrollDelta are read.
 */
export const isSnapSuppressed = (
	event: Pick<CanvasEvent, "mods" | "scrollDelta">,
): boolean => event.mods.ctrl || event.scrollDelta !== undefined;
