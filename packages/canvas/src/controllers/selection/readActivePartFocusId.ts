import type { ObjectPartSelection } from "./ObjectPartSelection";

/**
 * The one part a reader that acts on a single part takes from the selection:
 * the focus of the active range (the last one, see
 * {@link ObjectPartSelection}), which is the part the last gesture moved to.
 * A reader acting on every covered part expands the ranges instead
 * (collectObjectPartIds).
 *
 * @param part - The parts picked one level below the object
 *   (`CanvasSelection.part`), taken as it stands; `ranges` is non-empty, so the
 *   answer is always an id the selection names. Of a range whose ends differ,
 *   the anchor is never the answer
 * @returns The active range's `focusId`
 */
export const readActivePartFocusId = (part: ObjectPartSelection): string =>
	part.ranges[part.ranges.length - 1].focusId;
