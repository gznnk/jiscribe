import { roundDocSize } from "@jiscribe/canvas-sdk/doc";

import type { ErEntitySlotDragStart } from "./calcErEntitySlotBoundaryDrag";
import type { ErEntitySlotWidths } from "../layout/erEntitySlotWidths";
import { ER_ENTITY_MIN_WIDTH } from "../schema/ErEntityDoc";

/**
 * The widths a drag on the entity's right edge lands on: the type column alone
 * takes the drag and the box grows or shrinks by the same amount, the key gutter
 * and the name unchanged — the name / type boundary's `"leading"` mode moved
 * onto the type (calcErEntitySlotBoundaryDrag). There is no `"pair"` mode, the
 * edge having no slot after it to trade with.
 *
 * @param start - The widths and floors as of gesture start (readErEntitySlotDragStart)
 * @param localDeltaX - How far the edge moved along the entity's local x axis, in px (calcErEntityLocalDragDelta); positive moves it right, away from the drawn corner
 * @returns The new widths, the type rounded to the doc's size precision and never below its floor (`start.floors.typeWidth`), nor below what keeps the box at {@link ER_ENTITY_MIN_WIDTH}
 */
export const calcErEntityTrailingEdgeDrag = (
	start: ErEntitySlotDragStart,
	localDeltaX: number,
): ErEntitySlotWidths => {
	const minTypeWidth = Math.max(
		start.floors.typeWidth,
		ER_ENTITY_MIN_WIDTH - start.keyWidth - start.nameWidth,
	);
	return {
		keyWidth: start.keyWidth,
		nameWidth: start.nameWidth,
		typeWidth: roundDocSize(
			Math.max(start.typeWidth + localDeltaX, minTypeWidth),
		),
	};
};
