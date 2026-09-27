import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, it, expect } from "vitest";

import type { TableDoc } from "../../schema/TableDoc";
import {
	TABLE_DOC_DEFAULTS,
	TABLE_MIN_COLUMN_WIDTH,
} from "../../schema/TableDoc";
import { tableToState } from "../TableMapper";
import { isValidTableState } from "../validateTableState";

// `tableToState` sizes the box from the cells' text, and measuring with nothing
// offered throws (see calcTableLayout.test.ts, which states the estimate's rule).
offerTextMeasurement(createEstimateTextMeasurement());

const baseState = tableToState({
	...TABLE_DOC_DEFAULTS,
	id: "t-1",
} as TableDoc);

describe("isValidTableState", () => {
	it("accepts what the mapper produces", () => {
		expect(isValidTableState(baseState)).toBe(true);
	});

	it("accepts a cell carrying a fill and its own styling", () => {
		expect(
			isValidTableState({
				...baseState,
				text: {
					...baseState.text,
					r0c0: { text: "項目", textAlign: "left", fill: "#ffeeaa" },
				},
			}),
		).toBe(true);
	});

	it("accepts a cell styled per range", () => {
		expect(
			isValidTableState({
				...baseState,
				text: {
					...baseState.text,
					r0c0: { text: [{ text: "項目", fontWeight: "bold" }] },
				},
			}),
		).toBe(true);
	});

	describe("the grid", () => {
		it("rejects an empty axis", () => {
			expect(isValidTableState({ ...baseState, columns: [], text: {} })).toBe(
				false,
			);
			expect(isValidTableState({ ...baseState, rows: [], text: {} })).toBe(
				false,
			);
		});

		it("rejects a column narrower than the bound", () => {
			expect(
				isValidTableState({
					...baseState,
					columns: [{ width: TABLE_MIN_COLUMN_WIDTH - 1 }, { width: 120 }],
				}),
			).toBe(false);
		});

		it("rejects a negative row height", () => {
			expect(
				isValidTableState({ ...baseState, rows: [{ height: -1 }, {}] }),
			).toBe(false);
		});
	});

	describe("the cell key set", () => {
		it("rejects a cell the grid has no place for", () => {
			expect(
				isValidTableState({
					...baseState,
					text: { ...baseState.text, r2c0: { text: "余り" } },
				}),
			).toBe(false);
		});

		it("rejects a cell the grid draws but the map is missing", () => {
			const { r1c1: _dropped, ...text } = baseState.text;
			expect(isValidTableState({ ...baseState, text })).toBe(false);
		});

		it("rejects a map keyed in another order", () => {
			// The key order is what makes the first key the top-left cell and what Tab
			// walks, so a reordered map draws right and steps wrong.
			expect(
				isValidTableState({
					...baseState,
					text: {
						r0c1: { text: "" },
						r0c0: { text: "" },
						r1c0: { text: "" },
						r1c1: { text: "" },
					},
				}),
			).toBe(false);
		});

		it("rejects a text that is not a map at all", () => {
			expect(isValidTableState({ ...baseState, text: "項目" })).toBe(false);
		});
	});

	describe("one cell", () => {
		it("rejects a cell holding no text", () => {
			expect(
				isValidTableState({
					...baseState,
					text: { ...baseState.text, r0c0: { fill: "#ffeeaa" } },
				}),
			).toBe(false);
		});

		it("rejects a cell holding rows instead of one body", () => {
			expect(
				isValidTableState({
					...baseState,
					text: { ...baseState.text, r0c0: { text: ["項", "目"] } },
				}),
			).toBe(false);
		});

		it("rejects a non-string fill", () => {
			expect(
				isValidTableState({
					...baseState,
					text: { ...baseState.text, r0c0: { text: "項目", fill: 16711680 } },
				}),
			).toBe(false);
		});

		it("rejects an out-of-enum alignment", () => {
			expect(
				isValidTableState({
					...baseState,
					text: {
						...baseState.text,
						r0c0: { text: "項目", textAlign: "middle" },
					},
				}),
			).toBe(false);
		});
	});

	it("rejects the height-follows-the-text flag, which point geometry never carries", () => {
		expect(isValidTableState({ ...baseState, autoHeight: true })).toBe(false);
	});
});
