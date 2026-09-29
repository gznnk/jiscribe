/**
 * The chain that carries a cell background from the menu to the file: the
 * property name a swatch writes, the field that name resolves to, and the fact
 * that the field is the one a cell actually holds. Each link is a string, so a
 * rename on either side would otherwise leave the menu writing into nothing.
 */
import { describe, it, expect } from "vitest";

import type { TableCell } from "../TableDoc";
import {
	TABLE_CELL_FILL_FIELD,
	TABLE_CELL_FILL_PROPERTY,
	TABLE_EXTRA_STYLE_PROPERTIES,
} from "../TableDoc";

describe("the cell background as a style property", () => {
	it("is declared as stored on the text slots, under the cell's own field", () => {
		expect(TABLE_EXTRA_STYLE_PROPERTIES).toEqual({
			cellFill: { valueType: "string", textSlotField: "fill" },
		});
	});

	it("names the field a cell holds", () => {
		// Typed rather than asserted on a value: the field name has to be a key of
		// TableCell, which is what makes the declaration reach the stored fill.
		const cell: TableCell = { text: "", [TABLE_CELL_FILL_FIELD]: "#eef" };
		expect(cell.fill).toBe("#eef");
	});

	it("is not named after the field, the plain name being the shape fill's", () => {
		// `fill` as a property name would be taken by the system handler, which a
		// table refuses (features.fill is false) — so the write would land nowhere.
		expect(TABLE_CELL_FILL_PROPERTY).not.toBe(TABLE_CELL_FILL_FIELD);
	});
});
