import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import type { TableState } from "../../state/TableState";
import { calcTableTrailingEdges } from "../calcTableTrailingEdges";

offerTextMeasurement(createEstimateTextMeasurement());

/** A 2x2 table of 100px columns and 50px rows centered at (500, 400). */
const makeTable = (overrides: Partial<TableState> = {}): TableState =>
	({
		id: "t-1",
		type: "table",
		cx: 500,
		cy: 400,
		width: 200,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		strokeWidth: 1,
		columns: [{ width: 100 }, { width: 100 }],
		rows: [{ height: 50 }, { height: 50 }],
		text: {},
		...overrides,
	}) as unknown as TableState;

describe("calcTableTrailingEdges", () => {
	it("puts the edges on the right and bottom of an unflipped table, full length", () => {
		const edges = calcTableTrailingEdges(makeTable());
		expect(edges.column).toEqual({
			from: { x: 600, y: 350 },
			to: { x: 600, y: 450 },
		});
		expect(edges.row).toEqual({
			from: { x: 400, y: 450 },
			to: { x: 600, y: 450 },
		});
	});

	it("moves the column edge to the left of a table mirrored on x", () => {
		const edges = calcTableTrailingEdges(makeTable({ scaleX: -1 }));
		expect(edges.column.from.x).toBeCloseTo(400);
		expect(edges.column.to.x).toBeCloseTo(400);
		expect(edges.row.from.y).toBeCloseTo(450);
	});

	it("moves the row edge to the top of a table mirrored on y", () => {
		const edges = calcTableTrailingEdges(makeTable({ scaleY: -1 }));
		expect(edges.row.from.y).toBeCloseTo(350);
		expect(edges.row.to.y).toBeCloseTo(350);
		expect(edges.column.from.x).toBeCloseTo(600);
	});
});
