import { roundDocSize } from "@jiscribe/canvas-sdk/doc";

import { ER_ENTITY_KEY_NAME_BOUNDARY } from "./erEntitySlotBoundaryAction";
import type {
	ErEntitySlotBoundaryDragMode,
	ErEntitySlotBoundaryIndex,
} from "./erEntitySlotBoundaryAction";
import type {
	ErEntitySlotFloors,
	ErEntitySlotWidths,
} from "../layout/erEntitySlotWidths";
import { ER_ENTITY_MIN_WIDTH } from "../schema/ErEntityDoc";

/** What a slot width drag starts from: the slot widths as drawn and the floors the texts set (readErEntitySlotDragStart). */
export type ErEntitySlotDragStart = ErEntitySlotWidths & {
	/** The narrowest each slot fits its texts at; a drag stops there, the layout drawing a slot no narrower anyway. */
	floors: ErEntitySlotFloors;
};

/** The least a slot left to absorb a drag can be: its floor, and whatever keeps the box at ER_ENTITY_MIN_WIDTH with the other two kept. */
const calcLeadingSlotMinWidth = (
	floorWidth: number,
	otherSlotsWidth: number,
): number => Math.max(floorWidth, ER_ENTITY_MIN_WIDTH - otherSlotsWidth);

/**
 * Two neighbouring slots trading width: the left one takes the drag, held
 * between its floor and what leaves the right one its floor.
 *
 * @returns The two new widths, left then right, or null when the pair is too narrow to hold both floors
 */
const tradeSlotPair = (
	leftWidth: number,
	rightWidth: number,
	leftFloor: number,
	rightFloor: number,
	localDeltaX: number,
): [number, number] | null => {
	const pairWidth = leftWidth + rightWidth;
	const maxLeftWidth = pairWidth - rightFloor;
	// A drag starts from the drawn widths, each at least its floor, so this is not reached.
	if (maxLeftWidth < leftFloor) {
		return null;
	}
	const draggedLeftWidth = roundDocSize(
		Math.min(Math.max(leftWidth + localDeltaX, leftFloor), maxLeftWidth),
	);
	return [draggedLeftWidth, roundDocSize(pairWidth - draggedLeftWidth)];
};

/** The key / name boundary: the key gutter alone resizes and the box with it, or with `"pair"` the key and the name trade. */
const dragKeyNameBoundary = (
	start: ErEntitySlotDragStart,
	localDeltaX: number,
	mode: ErEntitySlotBoundaryDragMode,
): ErEntitySlotWidths | null => {
	if (mode === "pair") {
		const pair = tradeSlotPair(
			start.keyWidth,
			start.nameWidth,
			start.floors.keyWidth,
			start.floors.nameWidth,
			localDeltaX,
		);
		return pair === null
			? null
			: { keyWidth: pair[0], nameWidth: pair[1], typeWidth: start.typeWidth };
	}
	const minKeyWidth = calcLeadingSlotMinWidth(
		start.floors.keyWidth,
		start.nameWidth + start.typeWidth,
	);
	return {
		keyWidth: roundDocSize(Math.max(start.keyWidth + localDeltaX, minKeyWidth)),
		nameWidth: start.nameWidth,
		typeWidth: start.typeWidth,
	};
};

/** The name / type boundary: the name alone resizes and the box with it, or with `"pair"` the name and the type trade. */
const dragNameTypeBoundary = (
	start: ErEntitySlotDragStart,
	localDeltaX: number,
	mode: ErEntitySlotBoundaryDragMode,
): ErEntitySlotWidths | null => {
	if (mode === "pair") {
		const pair = tradeSlotPair(
			start.nameWidth,
			start.typeWidth,
			start.floors.nameWidth,
			start.floors.typeWidth,
			localDeltaX,
		);
		return pair === null
			? null
			: { keyWidth: start.keyWidth, nameWidth: pair[0], typeWidth: pair[1] };
	}
	const minNameWidth = calcLeadingSlotMinWidth(
		start.floors.nameWidth,
		start.keyWidth + start.typeWidth,
	);
	return {
		keyWidth: start.keyWidth,
		nameWidth: roundDocSize(
			Math.max(start.nameWidth + localDeltaX, minNameWidth),
		),
		typeWidth: start.typeWidth,
	};
};

/**
 * The widths a slot boundary drag lands on, in one of two modes.
 *
 * - **`"leading"`**: the slot left of the boundary takes the whole drag and the
 *   box grows or shrinks by the same amount, the slot right of it unchanged. On
 *   the key / name boundary that is the key gutter, on the name / type boundary
 *   the name.
 * - **`"pair"`**: the two slots either side trade width and the box keeps its
 *   width.
 *
 * Every slot stops at its floor (`start.floors`), under which the layout would
 * draw it wider anyway, and the box at {@link ER_ENTITY_MIN_WIDTH}.
 *
 * @param start - The widths and floors as of gesture start (readErEntitySlotDragStart)
 * @param boundaryIndex - {@link ER_ENTITY_KEY_NAME_BOUNDARY} or {@link ER_ENTITY_NAME_TYPE_BOUNDARY}
 * @param localDeltaX - How far the boundary moved along the entity's local x axis, in px (calcErEntityLocalDragDelta); positive moves it right
 * @param mode - Whether the left slot alone resizes or the pair trades (readErEntitySlotBoundaryDragMode)
 * @returns The new slot widths, a moved one rounded to the doc's size precision and the box their sum; null in `"pair"` when the two slots are already too narrow to hold both floors
 */
export const calcErEntitySlotBoundaryDrag = (
	start: ErEntitySlotDragStart,
	boundaryIndex: ErEntitySlotBoundaryIndex,
	localDeltaX: number,
	mode: ErEntitySlotBoundaryDragMode,
): ErEntitySlotWidths | null => {
	if (boundaryIndex === ER_ENTITY_KEY_NAME_BOUNDARY) {
		return dragKeyNameBoundary(start, localDeltaX, mode);
	}
	return dragNameTypeBoundary(start, localDeltaX, mode);
};
