import { isGroupingItemShown } from "./isGroupingItemShown";
import type { ObjectPartKindRegistry } from "../../../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { isArrangeableSelection } from "../../../../utils/isArrangeableSelection";

/**
 * Whether the sidebar shows its Arrange section — the stacking-order buttons
 * and, where it is offered, the group / ungroup one.
 *
 * Grouping reaches across parents where the stacking order does not, so a
 * selection the stacking order cannot run on still gets the section for the
 * grouping button alone; the stacking buttons then stand disabled. A picked part
 * narrows only the grouping button away (isGroupingItemShown): the stacking order
 * stays, still acting on the object that owns the part.
 *
 * @param state - The selection channels and the picked part are read
 * @param objectPartKind - Per-canvas registry of part kinds, handed on to isGroupingItemShown
 * @returns True while the selection can be reordered (isArrangeableSelection) or the grouping button is shown
 */
export const isArrangeSectionShown = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): boolean =>
	isArrangeableSelection(state) || isGroupingItemShown(state, objectPartKind);
