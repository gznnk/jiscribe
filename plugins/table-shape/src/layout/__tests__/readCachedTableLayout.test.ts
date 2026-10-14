import {
	advanceTextMeasurementGeneration,
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import type { Dimensions } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { calcTableTextSlotRegions } from "../../presentation/calcTableTextSlotRegions";
import { tableCellTextSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import { calcTableFrameSize } from "../calcTableFrameSize";
import { calcTableLayout } from "../calcTableLayout";
import type { TableLayoutSource } from "../calcTableLayout";
import {
	readCachedTableLayout,
	writeTableLayoutCache,
} from "../readCachedTableLayout";

// Counts layout passes: the measurement is asked for one measurer per styled run
// per pass, so a pass over a grid of plain cells asks once per cell.
let measurerCount = 0;
const estimate = createEstimateTextMeasurement();
offerTextMeasurement({
	...estimate,
	createMeasurer: (font) => {
		measurerCount++;
		return estimate.createMeasurer(font);
	},
});

/** A 3x4 grid of plain cells. */
const makeTable = (): Dimensions & TableLayoutSource => {
	const text: Record<string, TableCell> = {};
	for (let row = 0; row < 3; row++) {
		for (let column = 0; column < 4; column++) {
			text[tableCellTextSlotId(row, column)] = { text: `r${row}c${column}` };
		}
	}
	return {
		width: 320,
		height: 0,
		columns: [{ width: 80 }, { width: 80 }, { width: 80 }, { width: 80 }],
		rows: [{}, {}, {}],
		text,
		strokeWidth: 1,
	};
};

describe("readCachedTableLayout", () => {
	it("computes once per grid and hands the same layout back", () => {
		const table = makeTable();
		measurerCount = 0;

		const first = readCachedTableLayout(table);
		const second = readCachedTableLayout(table);

		expect(second).toBe(first);
		expect(measurerCount).toBe(12);
	});

	it("hands the same layout to another object holding the same grid, as a moved table is", () => {
		const table = makeTable();
		const held = readCachedTableLayout(table);
		measurerCount = 0;

		const moved = { ...table, cx: 500, cy: 300, rotation: 45 };

		expect(readCachedTableLayout(moved)).toBe(held);
		expect(measurerCount).toBe(0);
	});

	// The layout is computed anew whichever input is replaced, but a cell is
	// measured only when its object or its wrap width is new
	// (readCachedCellTextHeight): only the rule width moves every wrap width here.
	it.each([
		[
			"text",
			(table: ReturnType<typeof makeTable>) => ({
				...table,
				text: { ...table.text },
			}),
			0,
		],
		[
			"rows",
			(table: ReturnType<typeof makeTable>) => ({
				...table,
				rows: [...(table.rows ?? [])],
			}),
			0,
		],
		[
			"strokeWidth",
			(table: ReturnType<typeof makeTable>) => ({ ...table, strokeWidth: 2 }),
			12,
		],
		[
			"columns",
			(table: ReturnType<typeof makeTable>) => ({
				...table,
				columns: [...(table.columns ?? [])],
			}),
			0,
		],
	])(
		"computes anew once the %s are replaced",
		(_, replace, expectedMeasurerCount) => {
			const table = makeTable();
			const held = readCachedTableLayout(table);
			measurerCount = 0;

			const replaced = readCachedTableLayout(replace(table));

			expect(replaced).not.toBe(held);
			expect(measurerCount).toBe(expectedMeasurerCount);
		},
	);

	it("keeps one entry per grid, so reading another table evicts nothing", () => {
		const table = makeTable();
		const other = makeTable();
		const held = readCachedTableLayout(table);
		readCachedTableLayout(other);
		measurerCount = 0;

		expect(readCachedTableLayout(table)).toBe(held);
		expect(measurerCount).toBe(0);
	});

	it("is left alone by calcTableFrameSize, which sizes objects nobody renders", () => {
		const table = makeTable();
		const held = readCachedTableLayout(table);
		measurerCount = 0;

		calcTableFrameSize({ ...table });

		expect(readCachedTableLayout(table)).toBe(held);
		// The cells were measured for `held`, so sizing the same grid measures none.
		expect(measurerCount).toBe(0);
	});

	it("computes anew once the measurement generation moves on, as web fonts arriving move it", () => {
		const table = makeTable();
		const held = readCachedTableLayout(table);
		measurerCount = 0;

		advanceTextMeasurementGeneration();
		const remeasured = readCachedTableLayout(table);

		expect(remeasured).not.toBe(held);
		expect(measurerCount).toBe(12);
	});

	it("is what the cells' regions read, so placing them twice measures the cells once", () => {
		const table = makeTable();
		measurerCount = 0;

		calcTableTextSlotRegions(table);
		calcTableTextSlotRegions(table);

		expect(measurerCount).toBe(12);
	});
});

describe("writeTableLayoutCache", () => {
	it("replaces what the same object hands back", () => {
		const table = makeTable();
		const stale = readCachedTableLayout(table);
		const fresh = calcTableLayout(table);

		writeTableLayoutCache(table, fresh);

		expect(readCachedTableLayout(table)).toBe(fresh);
		expect(fresh).not.toBe(stale);
	});

	it("lets another object hand back a layout computed for one, measuring nothing", () => {
		const table = makeTable();
		const layout = readCachedTableLayout(table);
		const boxed = { ...table, width: 999 };
		measurerCount = 0;

		writeTableLayoutCache(boxed, layout);

		expect(readCachedTableLayout(boxed)).toBe(layout);
		expect(measurerCount).toBe(0);
	});
});
