import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, it, expect } from "vitest";

import { calcTableFrameSize } from "../../layout/calcTableFrameSize";
import type { TableDoc } from "../../schema/TableDoc";
import { TABLE_DOC_DEFAULTS } from "../../schema/TableDoc";
import { tableToDoc, tableToState } from "../TableMapper";

// `tableToState` sizes the box from the cells' text, and measuring with nothing
// offered throws (see calcTableLayout.test.ts, which states the estimate's rule).
offerTextMeasurement(createEstimateTextMeasurement());

const makeDoc = (fields: Partial<TableDoc> = {}): TableDoc =>
	({
		id: "t-1",
		type: "table",
		x: 100,
		y: 100,
		columns: [{ width: 110 }, { width: 90 }],
		rows: [{ height: 36 }, {}],
		cells: [
			["項目", "担当"],
			["設計", "中川"],
		],
		...fields,
	}) as unknown as TableDoc;

describe("tableToState", () => {
	it("keys the cells row by row, top-left first", () => {
		const state = tableToState(makeDoc());
		expect(Object.keys(state.text)).toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
		expect(state.text).toEqual({
			r0c0: { text: "項目" },
			r0c1: { text: "担当" },
			r1c0: { text: "設計" },
			r1c1: { text: "中川" },
		});
	});

	it("expands a cell written as text alone into a slot", () => {
		const state = tableToState(
			makeDoc({
				cells: [
					["項目", [{ text: "担", fontWeight: "bold" }, { text: "当" }]],
					["", ""],
				],
			}),
		);
		expect(state.text.r0c0).toEqual({ text: "項目" });
		expect(state.text.r0c1).toEqual({
			text: [{ text: "担", fontWeight: "bold" }, { text: "当" }],
		});
	});

	it("leaves the typography a cell omits unset, for the draw side to resolve", () => {
		// The cell look is registered as the type's draw-time defaults
		// (TABLE_CELL_STYLE_DEFAULTS), so materializing it here would put five fields
		// per cell into a document that never wrote them.
		const state = tableToState(makeDoc());
		expect(state.text.r0c0).toEqual({ text: "項目" });
	});

	it("keeps a cell's own styling and its fill", () => {
		const state = tableToState(
			makeDoc({
				cells: [
					[{ text: "項目", textAlign: "left", fill: "#ffeeaa" }, "担当"],
					["設計", "中川"],
				],
			}),
		);
		expect(state.text.r0c0).toEqual({
			text: "項目",
			textAlign: "left",
			fill: "#ffeeaa",
		});
	});

	it("canonicalizes a cell's text", () => {
		const state = tableToState(
			makeDoc({
				cells: [
					[[{ text: "項" }, { text: "目" }], [{ text: "" }]],
					["設計", "中川"],
				],
			}),
		);
		expect(state.text.r0c0).toEqual({ text: "項目" });
		expect(state.text.r0c1).toEqual({ text: "" });
	});

	it("keys off the grid, so a short row still yields the cells the axes claim", () => {
		// The mismatch itself is the doc validator's to refuse; the state's key set
		// has to hold whatever reached here.
		const state = tableToState(makeDoc({ cells: [["項目"]] }));
		expect(Object.keys(state.text)).toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
		expect(state.text.r0c1).toEqual({ text: "" });
	});

	it("sizes the box from the grid, grown from the document's own corner", () => {
		// The same measurement the content resizer keeps it at (calcTableFrameSize), run
		// here so no caller ever sees a table with no extent; a *stored* size is what
		// could only ever disagree with the grid.
		const state = tableToState(makeDoc());
		const size = calcTableFrameSize(state);
		expect(size.width).toBe(200);
		expect(state).toMatchObject({
			cx: 100 + size.width / 2,
			cy: 100 + size.height / 2,
			width: size.width,
			height: size.height,
		});
		// `autoHeight` belongs to a rect doc that leaves its height out, and the
		// state validator refuses it on any other geometry.
		expect(state.autoHeight).toBeUndefined();
	});

	it("copies the axes, so two tables from the same defaults share none", () => {
		const doc = makeDoc();
		const state = tableToState(doc);
		expect(state.columns).toEqual(doc.columns);
		expect(state.columns[0]).not.toBe(doc.columns[0]);
		expect(state.rows[0]).not.toBe(doc.rows[0]);
	});
});

describe("tableToDoc", () => {
	it("folds a cell carrying nothing but text back to that text", () => {
		const doc = tableToDoc(tableToState(makeDoc()));
		expect(doc.cells).toEqual([
			["項目", "担当"],
			["設計", "中川"],
		]);
	});

	it("keeps the object form for a cell that carries more", () => {
		const doc = tableToDoc(
			tableToState(
				makeDoc({
					cells: [
						[
							{ text: "項目", fill: "#ffeeaa" },
							{ text: "担当", fontSize: 16 },
						],
						["設計", "中川"],
					],
				}),
			),
		);
		expect(doc.cells[0]).toEqual([
			{ text: "項目", fill: "#ffeeaa" },
			{ text: "担当", fontSize: 16 },
		]);
	});

	it("writes no box and no slot map", () => {
		const doc: Record<string, unknown> = tableToDoc(tableToState(makeDoc()));
		expect("width" in doc).toBe(false);
		expect("height" in doc).toBe(false);
		expect("text" in doc).toBe(false);
	});

	it("puts the drawn top-left corner back, rotation included", () => {
		const state = tableToState(makeDoc());
		const grown = { ...state, width: 200, height: 72, cx: 200, cy: 136 };
		expect(tableToDoc(grown)).toMatchObject({ x: 100, y: 100 });
		// Turned a quarter turn about its center, the local top-left corner lands
		// where the local top-right one was.
		expect(tableToDoc({ ...grown, rotation: 90 })).toMatchObject({
			x: 236,
			y: 36,
		});
	});
});

describe("doc round trip", () => {
	it("keeps a grid written in the short form", () => {
		const doc = makeDoc();
		expect(tableToDoc(tableToState(doc))).toEqual(doc);
	});

	it("keeps the styling a cell omits omitted", () => {
		const doc = makeDoc({
			cells: [
				[{ text: "項目", verticalAlign: "top" }, "担当"],
				["設計", "中川"],
			],
		});
		expect(tableToDoc(tableToState(doc))).toEqual(doc);
	});

	it("keeps a cell's fill", () => {
		const doc = makeDoc({
			cells: [
				[{ text: "項目", fill: "#ffeeaa" }, "担当"],
				[{ fill: "rgba(0,0,0,0.1)", text: "" }, "中川"],
			],
		});
		expect(tableToDoc(tableToState(doc))).toEqual(doc);
	});

	it("keeps the type's own doc defaults", () => {
		const doc = { ...TABLE_DOC_DEFAULTS, id: "t-1" } as TableDoc;
		expect(tableToDoc(tableToState(doc))).toEqual(doc);
	});
});
