import {
	measureTextWidth,
	roundDocSize,
	TEXT_BOX_PADDING_X,
} from "@jiscribe/canvas-sdk/doc";

import type { ErEntityLayoutSource } from "./readErEntityLayoutSource";
import {
	ER_ENTITY_MIN_SLOT_WIDTHS,
	ER_ENTITY_MIN_WIDTH,
} from "../schema/ErEntityDoc";

/** The widths of a row's three slots, in px; the box is their sum (sumErEntitySlotWidths). */
export type ErEntitySlotWidths = {
	/** Key gutter width in px. */
	keyWidth: number;
	/** Name column width in px. */
	nameWidth: number;
	/** Type column width in px. */
	typeWidth: number;
};

/** The narrowest each slot of a row fits its texts at, in px. */
export type ErEntitySlotFloors = {
	/** Widest key in its own font plus the text box padding, never below its ER_ENTITY_MIN_SLOT_WIDTHS entry: the derived key gutter, and the least a stated one is drawn at. */
	keyWidth: number;
	/** Widest column name likewise, never below its ER_ENTITY_MIN_SLOT_WIDTHS entry. */
	nameWidth: number;
	/** Widest type likewise, never below its ER_ENTITY_MIN_SLOT_WIDTHS entry. */
	typeWidth: number;
};

/** Width one text needs in its slot: its single-line width rounded up plus the text box padding on both sides. */
const calcSlotTextWidth = (widestText: number): number =>
	Math.ceil(widestText) + TEXT_BOX_PADDING_X * 2;

/**
 * The narrowest each slot of a row fits its texts at, every text measured in
 * its own font in one pass over the columns. An entity of no columns gets the
 * fixed minimums (ER_ENTITY_MIN_SLOT_WIDTHS).
 *
 * @param source - The entity's content; its slot widths are not read
 * @returns The three floors in px, whole when the measured widths are
 */
export const calcErEntitySlotFloors = (
	source: ErEntityLayoutSource,
): ErEntitySlotFloors => {
	let widestKey = 0;
	let widestName = 0;
	let widestType = 0;
	for (const column of source.columns) {
		widestKey = Math.max(
			widestKey,
			measureTextWidth(column.key, column.keyFont),
		);
		widestName = Math.max(
			widestName,
			measureTextWidth(column.name, column.nameFont),
		);
		widestType = Math.max(
			widestType,
			measureTextWidth(column.type, column.typeFont),
		);
	}
	return {
		keyWidth: Math.max(
			calcSlotTextWidth(widestKey),
			ER_ENTITY_MIN_SLOT_WIDTHS.keyWidth,
		),
		nameWidth: Math.max(
			calcSlotTextWidth(widestName),
			ER_ENTITY_MIN_SLOT_WIDTHS.nameWidth,
		),
		typeWidth: Math.max(
			calcSlotTextWidth(widestType),
			ER_ENTITY_MIN_SLOT_WIDTHS.typeWidth,
		),
	};
};

/**
 * The box width three slot widths add up to: the one way it is summed, so a sum
 * compared on one side and written on the other cannot disagree by a float.
 *
 * @param widths - The three slot widths in px
 * @returns Their sum rounded to the doc's size precision (roundDocSize)
 */
export const sumErEntitySlotWidths = (widths: ErEntitySlotWidths): number =>
	roundDocSize(widths.keyWidth + widths.nameWidth + widths.typeWidth);

/**
 * Widens whatever does not fit: each slot narrower than its floor rises to it,
 * the others keeping their px, and when the three still sum to less than
 * {@link ER_ENTITY_MIN_WIDTH} the name column takes the shortfall. Never
 * narrows a slot.
 *
 * @param widths - The slot widths to fit
 * @param floors - The entity's floors (calcErEntitySlotFloors)
 * @returns `widths` itself when nothing widens, else fresh widths; a second call on the result hands it back
 */
export const fitErEntitySlotWidths = (
	widths: ErEntitySlotWidths,
	floors: ErEntitySlotFloors,
): ErEntitySlotWidths => {
	const keyWidth = Math.max(widths.keyWidth, floors.keyWidth);
	const typeWidth = Math.max(widths.typeWidth, floors.typeWidth);
	const nameFloorWidth = Math.max(widths.nameWidth, floors.nameWidth);
	const shortfall =
		ER_ENTITY_MIN_WIDTH - (keyWidth + nameFloorWidth + typeWidth);
	const nameWidth =
		shortfall > 0 ? roundDocSize(nameFloorWidth + shortfall) : nameFloorWidth;
	if (
		keyWidth === widths.keyWidth &&
		nameWidth === widths.nameWidth &&
		typeWidth === widths.typeWidth
	) {
		return widths;
	}
	return { keyWidth, nameWidth, typeWidth };
};

/**
 * The widths the slots are drawn at: the stated ones, an unstated key gutter
 * read as the widest key's, each fitted to its texts (fitErEntitySlotWidths).
 * The one way stated widths become drawn ones; measurement never writes the
 * result back as stated.
 *
 * @param source - The entity's optional stated `keyWidth` and its stated `nameWidth` / `typeWidth`
 * @param floors - The entity's floors (calcErEntitySlotFloors)
 * @returns The drawn widths in px, each at least its floor
 */
export const fitErEntityStatedSlotWidths = (
	source: Pick<ErEntityLayoutSource, "keyWidth" | "nameWidth" | "typeWidth">,
	floors: ErEntitySlotFloors,
): ErEntitySlotWidths =>
	fitErEntitySlotWidths(
		{
			keyWidth: source.keyWidth ?? floors.keyWidth,
			nameWidth: source.nameWidth,
			typeWidth: source.typeWidth,
		},
		floors,
	);

/**
 * Narrowest the box may be drawn with the key gutter it has: that gutter plus
 * the name and type floors, the narrowest the width distribution can honour
 * (distributeErEntityWidthToSlots). The left and right handles stop there (the
 * state's `minWidth`), so a handle resize never asks reconcileErEntityBox to
 * widen a column back against the cursor.
 *
 * @param keyWidth - The key gutter width in px the box is drawn with, already fitted to the key floor
 * @param floors - The entity's floors
 * @returns Width in px, never below {@link ER_ENTITY_MIN_WIDTH}
 */
export const calcErEntityMinWidth = (
	keyWidth: number,
	floors: ErEntitySlotFloors,
): number =>
	Math.max(
		ER_ENTITY_MIN_WIDTH,
		roundDocSize(keyWidth + floors.nameWidth + floors.typeWidth),
	);
