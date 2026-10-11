import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { createDocOps } from "@jiscribe/doc";
import type { CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { tableDocDefinition, tableDocPlugin } from "../doc";
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

describe("the table's doc-side box", () => {
	/** Doc-ops that know the table, which is how a Node host measures one. */
	const docOps = createDocOps({ plugins: [tableDocPlugin] });

	// Without the type's own size declaration the ops measure a point-geometry doc
	// as the body text it does not have, and a table reports a box of about nothing
	// — which every op working off one (align, distribute, overlap) then believes.
	it("measures the grid, so the ops see the box the table draws", () => {
		const doc: CanvasDoc = { version: 1, root: [] };
		const id = docOps.addObject(doc, "table", { x: 40, y: 60 });

		const bounds = docOps.getObjectBounds(doc, id);

		expect(bounds?.width).toBe(defaultSize.width);
		expect(bounds?.height).toBe(defaultSize.height);
		expect(bounds?.x).toBeCloseTo(40, 3);
		expect(bounds?.y).toBeCloseTo(60, 3);
	});
});
