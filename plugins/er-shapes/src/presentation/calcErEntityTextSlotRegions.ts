import type { Rect } from "@jiscribe/geometry";

import { calcErEntityColumnSlotBand } from "../layout/calcErEntityColumnSlotBand";
import type { ErEntityLayout } from "../layout/calcErEntityLayout";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import type { ErEntityLayoutInput } from "../layout/readErEntityLayoutSource";
import {
	erEntityColumnTextSlotId,
	parseErEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";
import {
	ER_ENTITY_COLUMN_FIELDS,
	ER_ENTITY_NAME_TEXT_SLOT_ID,
} from "../schema/ErEntityDoc";
import type { ErEntityColumnField } from "../schema/ErEntityDoc";

/** One column's three cells of its row band, in local coordinates. */
export type ErEntityColumnSlotBands = {
	/** Index into the declared columns. */
	columnIndex: number;
} & Record<ErEntityColumnField, Rect>;

/**
 * Splits every row band into the column's three cells. The cells are a row pitch
 * tall, so the rows tile the box under the title band; they are the slots' hit
 * areas (ErEntityBox).
 *
 * @param layout - The entity's layout
 * @returns One entry per row, in declared order
 */
export const calcErEntityColumnSlotBands = (
	layout: ErEntityLayout,
): ErEntityColumnSlotBands[] =>
	layout.rows.map(({ columnIndex, band }) => ({
		columnIndex,
		key: calcErEntityColumnSlotBand(layout, band, "key"),
		name: calcErEntityColumnSlotBand(layout, band, "name"),
		type: calcErEntityColumnSlotBand(layout, band, "type"),
	}));

/**
 * Where every slot of an entity is drawn and edited, in local coordinates (shape
 * center as origin, top-left based): the title band for `name`, and for each
 * column the cells of its row (calcErEntityColumnSlotBands) as they are: the row
 * pitch already includes the text box's vertical padding, so the shared text box
 * holds exactly one line and its outline matches the row. The `"textSlot"` part
 * kind's `regions`, which the overlays read; {@link calcErEntityTextSlotRegion}
 * answers one slot the same way.
 *
 * @param state - The slot widths plus the slots; the layout is derived from them (readCachedErEntityLayout), so a stale box on the state does not move a slot
 * @returns One region per slot of the state, keyed by slot id
 */
export const calcErEntityTextSlotRegions = (
	state: ErEntityLayoutInput,
): Record<string, Rect> => {
	const layout = readCachedErEntityLayout(state);
	const regions: Record<string, Rect> = {
		[ER_ENTITY_NAME_TEXT_SLOT_ID]: layout.header,
	};
	for (const bands of calcErEntityColumnSlotBands(layout)) {
		for (const field of ER_ENTITY_COLUMN_FIELDS) {
			regions[erEntityColumnTextSlotId(bands.columnIndex, field)] =
				bands[field];
		}
	}
	return regions;
};

/**
 * Where one slot of an entity is drawn and edited, as
 * {@link calcErEntityTextSlotRegions} places it: the `"textSlot"` part kind's
 * `region`, which the in-place editor and the outline of a picked slot ask once
 * per slot, so it reads the cached layout rather than placing every slot.
 *
 * @param state - The slot widths plus the slots, as for calcErEntityTextSlotRegions
 * @param slotId - A slot the state holds: the title or a column slot
 * @returns The slot's region in local coordinates
 * @throws When `slotId` names no slot the layout places; the canvas asks only for slots the state holds, so this is an invariant broken upstream
 */
export const calcErEntityTextSlotRegion = (
	state: ErEntityLayoutInput,
	slotId: string,
): Rect => {
	const layout = readCachedErEntityLayout(state);
	if (slotId === ER_ENTITY_NAME_TEXT_SLOT_ID) {
		return layout.header;
	}
	const columnSlot = parseErEntityColumnTextSlotId(slotId);
	const row =
		columnSlot === null ? undefined : layout.rows[columnSlot.columnIndex];
	if (columnSlot === null || row === undefined) {
		throw new Error(`erEntity places no text slot "${slotId}"`);
	}
	return calcErEntityColumnSlotBand(layout, row.band, columnSlot.field);
};
