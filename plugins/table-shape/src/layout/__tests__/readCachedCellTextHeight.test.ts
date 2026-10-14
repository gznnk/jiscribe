import {
	advanceTextMeasurementGeneration,
	calcWrappedTextBlockSize,
	createEstimateTextMeasurement,
	DEFAULT_FONT_FAMILY,
	offerTextMeasurement,
	TEXT_STYLE_FALLBACK,
} from "@jiscribe/canvas-sdk/doc";
import { beforeEach, describe, expect, it } from "vitest";

import type { TableCell } from "../../schema/TableDoc";
import { readCachedCellTextHeight } from "../readCachedCellTextHeight";

// One measurer per plain cell measured, so the count is the number of cells that
// actually went to the measurement.
let measurerCount = 0;
const estimate = createEstimateTextMeasurement();
offerTextMeasurement({
	...estimate,
	createMeasurer: (font) => {
		measurerCount++;
		return estimate.createMeasurer(font);
	},
});

describe("readCachedCellTextHeight", () => {
	beforeEach(() => {
		measurerCount = 0;
	});

	it("answers what the shared measurement gives the cell", () => {
		const cell: TableCell = { text: "aaaaaa aaaaaa aaaaaa", fontSize: 20 };

		expect(readCachedCellTextHeight(cell, 80)).toBe(
			calcWrappedTextBlockSize(
				cell.text,
				{
					fontSize: 20,
					fontFamily: DEFAULT_FONT_FAMILY,
					fontWeight: TEXT_STYLE_FALLBACK.fontWeight,
				},
				80,
			).height,
		);
	});

	it("measures one cell at one width once", () => {
		const cell: TableCell = { text: "hello" };

		const first = readCachedCellTextHeight(cell, 119);
		const second = readCachedCellTextHeight(cell, 119);

		expect(second).toBe(first);
		expect(measurerCount).toBe(1);
	});

	it("measures again at another width, which is what a column drag hands it", () => {
		const cell: TableCell = { text: "aaaaaa aaaaaa" };

		const wide = readCachedCellTextHeight(cell, 239);
		const narrow = readCachedCellTextHeight(cell, 59);

		expect(narrow).toBeGreaterThan(wide);
		expect(measurerCount).toBe(2);
	});

	it("measures a new cell object, however alike it is", () => {
		readCachedCellTextHeight({ text: "hello" }, 119);
		readCachedCellTextHeight({ text: "hello" }, 119);

		expect(measurerCount).toBe(2);
	});

	it("measures a position with no cell as an empty one", () => {
		expect(readCachedCellTextHeight(undefined, 119)).toBe(
			readCachedCellTextHeight({ text: "" }, 119),
		);
	});

	it("measures every cell again once the measurement generation moves on, as web fonts arriving move it", () => {
		const cell: TableCell = { text: "hello" };
		readCachedCellTextHeight(cell, 119);

		advanceTextMeasurementGeneration();
		readCachedCellTextHeight(cell, 119);
		readCachedCellTextHeight(cell, 119);

		expect(measurerCount).toBe(2);
	});
});
