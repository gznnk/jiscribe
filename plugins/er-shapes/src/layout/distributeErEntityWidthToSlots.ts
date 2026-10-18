import { roundDocSize } from "@jiscribe/canvas-sdk/doc";

import { fitErEntitySlotWidths } from "./erEntitySlotWidths";
import type {
	ErEntitySlotFloors,
	ErEntitySlotWidths,
} from "./erEntitySlotWidths";

/**
 * The slot widths an entity of `width` is made of: the key gutter kept, and the
 * rest split between the name and the type in the proportion their px hold now.
 * What turns a box width written from outside — the core width handle — into the
 * only thing an entity document stores about its size (see reconcileErEntityBox).
 *
 * Two things bound the proportion, as they do a table's columns
 * (distributeTableWidthToColumns):
 *
 * - **Neither column goes under its floor.** One whose share would is held at
 *   its floor and the other takes the rest.
 * - **A width below the key gutter plus both floors cannot be met.** The row is
 *   built at the floors instead, so the box stops there rather than narrowing past
 *   it (calcErEntityMinWidth is that width).
 *
 * The name is rounded to whole px and the type takes what is left to the doc's
 * size precision, so the three add back up to `width` exactly
 * (sumErEntitySlotWidths) and the next pass reads no outside write. The result is
 * fitted (fitErEntitySlotWidths), so a width under ER_ENTITY_MIN_WIDTH comes
 * back with the name widened to it: the one way a box width becomes slot widths.
 *
 * @param startWidths - The slot widths as drawn as of the write (fitErEntityStatedSlotWidths); read only
 * @param width - Box width to report, in local px; below the key gutter plus both floors it is raised to that, and a value at or under 0 yields the floors (fitted like any result)
 * @param floors - The entity's floors (calcErEntitySlotFloors)
 * @returns Fitted widths with `startWidths.keyWidth` kept; a name and type of 0 px together split evenly, there being no proportion to keep
 */
export const distributeErEntityWidthToSlots = (
	startWidths: ErEntitySlotWidths,
	width: number,
	floors: ErEntitySlotFloors,
): ErEntitySlotWidths => {
	const rowWidth = Math.max(
		width - startWidths.keyWidth,
		floors.nameWidth + floors.typeWidth,
	);
	const startRowWidth = startWidths.nameWidth + startWidths.typeWidth;
	const nameShare =
		startRowWidth > 0
			? (startWidths.nameWidth / startRowWidth) * rowWidth
			: rowWidth / 2;
	// Held between the two floors, which also pins whichever column's share falls
	// short and hands the other the rest.
	const nameWidth = Math.min(
		Math.max(Math.round(nameShare), floors.nameWidth),
		rowWidth - floors.typeWidth,
	);
	return fitErEntitySlotWidths(
		{
			keyWidth: startWidths.keyWidth,
			nameWidth: roundDocSize(nameWidth),
			typeWidth: roundDocSize(rowWidth - nameWidth),
		},
		floors,
	);
};
