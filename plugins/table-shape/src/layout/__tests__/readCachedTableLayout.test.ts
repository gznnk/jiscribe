import {
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
	it("computes once per state object and hands the same layout back", () => {
		const table = makeTable();
		measurerCount = 0;

		const first = readCachedTableLayout(table);
		const second = readCachedTableLayout(table);

		expect(second).toBe(first);
		expect(measurerCount).toBe(12);
	});

	it("computes anew for another object, even one holding the same grid", () => {
		const table = makeTable();
		readCachedTableLayout(table);
		measurerCount = 0;

		const moved = readCachedTableLayout({ ...table });

		expect(measurerCount).toBe(12);
		expect(moved).toEqual(readCachedTableLayout(table));
	});

	it("keeps one entry per object, so reading another table evicts nothing", () => {
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

		expect(measurerCount).toBe(12);
		expect(readCachedTableLayout(table)).toBe(held);
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
