import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { calcTableDocFrameSize } from "../calcTableDocFrameSize";

// The rows are sized from the cells' text, and measuring with nothing offered
// throws (see calcTableLayout.test.ts, which states the estimate's rule).
offerTextMeasurement(createEstimateTextMeasurement());

describe("calcTableDocFrameSize", () => {
	it("measures a doc with no axes as 0 x 0", () => {
		expect(calcTableDocFrameSize({})).toEqual({ width: 0, height: 0 });
	});

	it("measures a doc whose cells are missing as an empty grid of its tracks", () => {
		const withCells = calcTableDocFrameSize({
			columns: [{ width: 80 }, { width: 100 }],
			rows: [{}, {}],
			cells: [
				["", ""],
				["", ""],
			],
		});
		const withoutCells = calcTableDocFrameSize({
			columns: [{ width: 80 }, { width: 100 }],
			rows: [{}, {}],
		});

		expect(withoutCells).toEqual(withCells);
		expect(withoutCells.width).toBe(180);
	});

	it("reads either cell form, a bare text and a styled cell measuring alike", () => {
		const bare = calcTableDocFrameSize({
			columns: [{ width: 120 }],
			rows: [{}],
			cells: [["a\nb\nc"]],
		});
		const styled = calcTableDocFrameSize({
			columns: [{ width: 120 }],
			rows: [{}],
			cells: [[{ text: "a\nb\nc", textAlign: "left" }]],
		});
		const empty = calcTableDocFrameSize({
			columns: [{ width: 120 }],
			rows: [{}],
			cells: [[""]],
		});

		expect(styled).toEqual(bare);
		expect(bare.height).toBeGreaterThan(empty.height);
	});

	it("keeps a stored row height as a floor the text pushes past", () => {
		const tall = calcTableDocFrameSize({
			columns: [{ width: 120 }],
			rows: [{ height: 200 }],
			cells: [["x"]],
		});
		const outgrown = calcTableDocFrameSize({
			columns: [{ width: 120 }],
			rows: [{ height: 1 }],
			cells: [["a\nb\nc"]],
		});
		const unstated = calcTableDocFrameSize({
			columns: [{ width: 120 }],
			rows: [{}],
			cells: [["a\nb\nc"]],
		});

		expect(tall.height).toBeGreaterThanOrEqual(200);
		expect(outgrown).toEqual(unstated);
	});
});
