import {
	advanceTextMeasurementGeneration,
	calcWrappedTextBlockSize,
	createEstimateTextMeasurement,
	DEFAULT_FONT_FAMILY,
	offerTextMeasurement,
	resetTextMeasurementForTests,
	TEXT_BOX_PADDING_X,
	TEXT_STYLE_FALLBACK,
} from "@jiscribe/canvas-sdk/doc";
import type { TextMeasurement } from "@jiscribe/canvas-sdk/doc";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { TableCell } from "../../schema/TableDoc";
import { readCachedCellTextHeight } from "../readCachedCellTextHeight";

// One measurer per plain cell measured, so the count is the number of cells that
// actually went to the measurement.
let measurerCount = 0;
const estimate = createEstimateTextMeasurement();
const countedEstimate: TextMeasurement = {
	...estimate,
	createMeasurer: (font) => {
		measurerCount++;
		return estimate.createMeasurer(font);
	},
};
offerTextMeasurement(countedEstimate);

/** The font a plain cell with only a size set is measured with. */
const fontOfSize = (fontSize: number) => ({
	fontSize,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: TEXT_STYLE_FALLBACK.fontWeight,
});

/** What the full measurement gives a plain cell, uncached. */
const measureUncached = (cell: TableCell, wrapWidth: number): number =>
	calcWrappedTextBlockSize(
		typeof cell.text === "string" ? cell.text : "",
		fontOfSize(cell.fontSize ?? TEXT_STYLE_FALLBACK.fontSize),
		wrapWidth,
	).height;

// The estimate charges 0.6 em a character: 12 px at the 20 px type used below.
const CHAR_WIDTH = 12;
/** Box width a line of `charCount` characters exactly fills. */
const fittingWidth = (charCount: number): number =>
	charCount * CHAR_WIDTH + TEXT_BOX_PADDING_X * 2;

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

describe("readCachedCellTextHeight across widths", () => {
	beforeEach(() => {
		measurerCount = 0;
	});

	const texts = [
		"",
		"word",
		"aaaaaa aaaaaa aaaaaa",
		"first line\nsecond longer line\n\nlast",
		"日本語の文章を折り返す",
	];
	// The widest line of each text is 18 characters at most.
	const widths = [
		fittingWidth(18) + 40,
		fittingWidth(18),
		fittingWidth(18) - 1,
		fittingWidth(10),
		fittingWidth(10) - 1,
		fittingWidth(6),
		fittingWidth(6) - 1,
		fittingWidth(4),
		fittingWidth(4) - 1,
		fittingWidth(1),
		TEXT_BOX_PADDING_X * 2,
		0,
	];
	const orders = {
		narrowing: widths,
		widening: [...widths].reverse(),
		alternating: widths.flatMap((width, index) => [
			width,
			widths[widths.length - 1 - index],
		]),
	};

	for (const [orderName, order] of Object.entries(orders)) {
		it(`gives the full measurement's height for one cell read ${orderName}`, () => {
			for (const text of texts) {
				const cell: TableCell = { text, fontSize: 20 };
				for (const width of order) {
					expect(readCachedCellTextHeight(cell, width)).toBe(
						measureUncached(cell, width),
					);
				}
			}
		});
	}

	it("measures nothing at any width the unbroken text is known to fit", () => {
		const cell: TableCell = { text: "aaaaaa aaaaaa", fontSize: 20 };
		readCachedCellTextHeight(cell, fittingWidth(13) + 100);
		// The first narrower width is answered by one layout at the widest line.
		readCachedCellTextHeight(cell, fittingWidth(13) + 50);
		measurerCount = 0;

		for (
			let width = fittingWidth(13);
			width < fittingWidth(13) + 200;
			width++
		) {
			readCachedCellTextHeight(cell, width);
		}

		expect(measurerCount).toBe(0);
	});

	it("measures again one pixel narrower than the text fits, where it wraps", () => {
		const cell: TableCell = { text: "aaaaaa aaaaaa", fontSize: 20 };
		const fitting = readCachedCellTextHeight(cell, fittingWidth(13));
		measurerCount = 0;

		const narrower = readCachedCellTextHeight(cell, fittingWidth(13) - 1);

		expect(narrower).toBeGreaterThan(fitting);
		expect(measurerCount).toBe(1);
	});
});

describe("readCachedCellTextHeight under a measurement whose prefixes outmeasure the line", () => {
	// Any type size: a string ending in "a" is charged 40 px extra, so "aa" (60) measures wider
	// than "aa bb" (50): the widest line is no width the text fits at.
	const prefixHeavy: TextMeasurement = {
		source: "renderer",
		createMeasurer: () => (text) =>
			text.length * 10 + (text.endsWith("a") ? 40 : 0),
	};

	beforeAll(() => {
		resetTextMeasurementForTests();
		offerTextMeasurement(prefixHeavy);
	});

	afterAll(() => {
		resetTextMeasurementForTests();
		offerTextMeasurement(countedEstimate);
	});

	it("gives the full measurement's height at every width", () => {
		const cell: TableCell = { text: "aa bb", fontSize: 20 };
		const contentWidths = [200, 100, 60, 55, 50, 45, 60, 200, 50];

		for (const contentWidth of contentWidths) {
			const wrapWidth = contentWidth + TEXT_BOX_PADDING_X * 2;
			expect(readCachedCellTextHeight(cell, wrapWidth)).toBe(
				measureUncached(cell, wrapWidth),
			);
		}
	});
});
