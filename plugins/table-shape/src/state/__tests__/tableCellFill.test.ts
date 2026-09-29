/**
 * A table cell is a `TextSlot` with one field of the table's own on it (`fill`),
 * which works only because nothing shared narrows a slot to its known fields: the
 * slot guard does not reject an extra one, and every shared writer copies a slot
 * with `{ ...slot }`. Should the core ever start filtering, the cell backgrounds
 * would disappear from documents without an error anywhere — so this file holds
 * that assumption down.
 *
 * Reach: the shared **write** helpers (writeRichTextSlot / writeTextSlot /
 * blankTextSlots, and TextSlotStyleProperty) are not on the plugin-facing surface
 * (`@jiscribe/canvas/unstable`, hence `@jiscribe/canvas-sdk`), so what is pinned
 * here is the guard, the read path, the paste boundary and the mapper round trip.
 * Covering the writers needs them exported from that entry first.
 */
import { readRichTextSlot, readTextSlot } from "@jiscribe/canvas-sdk";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { isTextSlot, resolveTextSlotStyle } from "@jiscribe/doc";
import { describe, it, expect } from "vitest";

import type { TableCell, TableDoc } from "../../schema/TableDoc";
import {
	TABLE_CELL_STYLE_DEFAULTS,
	TABLE_DOC_DEFAULTS,
} from "../../schema/TableDoc";
import { tableToDoc, tableToState } from "../TableMapper";
import { isValidTableState } from "../validateTableState";

// `tableToState` sizes the box from the cells' text, and measuring with nothing
// offered throws (see calcTableLayout.test.ts, which states the estimate's rule).
offerTextMeasurement(createEstimateTextMeasurement());

const filledCell: TableCell = { text: "設計", fill: "#ffeeaa" };

const filledDoc = {
	...TABLE_DOC_DEFAULTS,
	id: "t-1",
	cells: [
		[filledCell, ""],
		["", { text: "中川", fill: "rgba(0, 0, 0, 0.08)", textAlign: "left" }],
	],
} as TableDoc;

describe("a cell's fill", () => {
	it("is not rejected by the shared slot guard", () => {
		// The one fact the whole design rests on: isTextSlot checks the fields it
		// knows and says nothing about the rest.
		expect(isTextSlot(filledCell)).toBe(true);
	});

	it("survives the doc round trip", () => {
		expect(tableToDoc(tableToState(filledDoc))).toEqual(filledDoc);
	});

	it("saves as the short form again once the field is taken away", () => {
		// What the menu's "no fill" write leaves behind is the field gone, not
		// emptied — which is the only way a cell gets back to writing as its text
		// alone (ExtraStyleProperty).
		const state = tableToState(filledDoc);
		const { fill: _dropped, ...clearedCell } = state.text.r0c0;
		const doc = tableToDoc({
			...state,
			text: { ...state.text, r0c0: clearedCell },
		});
		expect(doc.cells[0][0]).toBe("設計");
	});

	it("is on the slot the mapper hands the canvas", () => {
		const state = tableToState(filledDoc);
		expect(state.text.r0c0).toEqual(filledCell);
		expect(state.text.r1c1.fill).toBe("rgba(0, 0, 0, 0.08)");
	});

	it("passes the paste boundary", () => {
		expect(isValidTableState(tableToState(filledDoc))).toBe(true);
	});

	it("does not disturb reading the cell's text", () => {
		const state = tableToState(filledDoc);
		expect(readRichTextSlot(state.text, "r0c0")).toBe("設計");
		expect(readTextSlot(state.text, "r0c0")).toBe("設計");
	});

	it("stays out of the resolved typography", () => {
		// The draw side resolves a slot against the type's defaults and reads style
		// fields off the result, so `fill` must not appear among them — a table paints
		// the background itself from the cell.
		const resolved = resolveTextSlotStyle(
			TABLE_CELL_STYLE_DEFAULTS,
			filledCell,
		);
		expect("fill" in resolved).toBe(false);
	});
});
