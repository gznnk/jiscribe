import type { Rect } from "@jiscribe/geometry";

import type { ErEntityLayout } from "./calcErEntityLayout";
import type { ErEntityColumnField } from "../schema/ErEntityDoc";

/**
 * One field's cell of a band running the box's width: the key gutter at the
 * left, the name, and the type at the right, each as wide as the layout draws it.
 *
 * @param layout - The entity's layout, whose drawn slot widths split the band
 * @param band - A band the box's width wide, in local coordinates: one row's, or every row's together for a whole lane
 * @param field - Which of the three cells to cut out
 * @returns The cell, as tall as `band` and at its height
 */
export const calcErEntityColumnSlotBand = (
	layout: ErEntityLayout,
	band: Rect,
	field: ErEntityColumnField,
): Rect => {
	if (field === "key") {
		return { ...band, width: layout.keyWidth };
	}
	const nameLeft = band.x + layout.keyWidth;
	if (field === "name") {
		return { ...band, x: nameLeft, width: layout.nameWidth };
	}
	return { ...band, x: nameLeft + layout.nameWidth, width: layout.typeWidth };
};
