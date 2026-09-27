import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { tableDocDefinition } from "../doc";
import { calcTableDocFrameSize } from "../layout/calcTableDocFrameSize";
import { TABLE_DOC_DEFAULTS } from "../schema/TableDoc";

// The grid is sized from its cells' text, and measuring with nothing offered throws
// (see calcTableLayout.test.ts, which states the estimate's rule).
offerTextMeasurement(createEstimateTextMeasurement());

const factory = tableDocDefinition.factory;

/** The default grid's own size, which the placement is expected to centre. */
const defaultSize = calcTableDocFrameSize(TABLE_DOC_DEFAULTS);

describe("the table's doc factory", () => {
	it("reports half the grid it draws", () => {
		expect(factory?.calcDimensions()).toEqual({
			halfWidth: defaultSize.width / 2,
			halfHeight: defaultSize.height / 2,
		});
		// Two 120px columns: the width is the columns summed, never a stored field.
		expect(defaultSize.width).toBe(240);
	});

	it("centres the grid on the position, storing its top-left corner", () => {
		const doc = factory?.createDoc({ x: 500, y: 300 }) as unknown as {
			x: number;
			y: number;
		};

		expect(doc.x).toBeCloseTo(500 - defaultSize.width / 2, 3);
		expect(doc.y).toBeCloseTo(300 - defaultSize.height / 2, 3);
	});

	it("offers no bounds drawing: the shape does not own its box", () => {
		expect(factory?.createDocFromBounds).toBeUndefined();
	});
});
