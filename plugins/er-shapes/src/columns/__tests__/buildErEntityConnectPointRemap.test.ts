import { describe, expect, it } from "vitest";

import { calcErEntityLayout } from "../../layout/calcErEntityLayout";
import { readErEntityDocLayoutInput } from "../../layout/readErEntityLayoutSource";
import type { ErEntityColumnDoc } from "../../schema/ErEntityDoc";
import { buildErEntityConnectPointRemap } from "../buildErEntityConnectPointRemap";

/** The layout of an entity of `columnCount` columns at the default type size, 25 px a row under a 28 px title band. */
const layoutOfColumns = (columnCount: number) =>
	calcErEntityLayout(
		readErEntityDocLayoutInput({
			name: "users",
			columns: Array.from(
				{ length: columnCount },
				(_unused, columnIndex): ErEntityColumnDoc => ({
					name: `c${columnIndex}`,
				}),
			),
		}),
	);

describe("buildErEntityConnectPointRemap", () => {
	it("moves the points of every column behind an insertion one index along", () => {
		expect(
			buildErEntityConnectPointRemap(layoutOfColumns(3), layoutOfColumns(4), [
				0,
				null,
				1,
				2,
			]),
		).toEqual({
			"col:1:left": { kind: "connectPoint", id: "col:2:left" },
			"col:1:right": { kind: "connectPoint", id: "col:2:right" },
			"col:2:left": { kind: "connectPoint", id: "col:3:left" },
			"col:2:right": { kind: "connectPoint", id: "col:3:right" },
		});
	});

	it("sends a removed column's points to its side of the box at the height its row stood", () => {
		const startLayout = layoutOfColumns(3);
		const rewrittenLayout = layoutOfColumns(2);
		// Row 1 is centred 28 + 25 + 12.5 = 65.5 px below the top edge, of a box now 78 tall.
		expect(startLayout.height).toBe(103);
		expect(rewrittenLayout.height).toBe(78);

		const remap = buildErEntityConnectPointRemap(
			startLayout,
			rewrittenLayout,
			[0, 2],
		);

		expect(remap).toEqual({
			"col:1:left": { kind: "edge", side: "left", t: 0.8397 },
			"col:1:right": { kind: "edge", side: "right", t: 0.8397 },
			"col:2:left": { kind: "connectPoint", id: "col:1:left" },
			"col:2:right": { kind: "connectPoint", id: "col:1:right" },
		});
	});

	it("holds the ratio of a removed last row to the bottom edge", () => {
		// Row 2's center (90.5 px) is below the bottom of the 53 px box of no column.
		const remap = buildErEntityConnectPointRemap(
			layoutOfColumns(3),
			layoutOfColumns(0),
			[],
		);

		expect(remap["col:2:right"]).toEqual({ kind: "edge", side: "right", t: 1 });
	});

	it("maps a swap from the ids before it, so each end is looked up once", () => {
		expect(
			buildErEntityConnectPointRemap(
				layoutOfColumns(2),
				layoutOfColumns(2),
				[1, 0],
			),
		).toEqual({
			"col:0:left": { kind: "connectPoint", id: "col:1:left" },
			"col:0:right": { kind: "connectPoint", id: "col:1:right" },
			"col:1:left": { kind: "connectPoint", id: "col:0:left" },
			"col:1:right": { kind: "connectPoint", id: "col:0:right" },
		});
	});

	it("has no entry for a column that keeps its index, nor for one the entity did not have", () => {
		const remap = buildErEntityConnectPointRemap(
			layoutOfColumns(2),
			layoutOfColumns(3),
			[0, 1, null],
		);

		expect(remap).toEqual({});
		expect(Object.hasOwn(remap, "col:5:left")).toBe(false);
	});
});
