import { describe, expect, it } from "vitest";

import { calcRecordContentHeight } from "../calcRecordContentHeight";
import { diagnoseRecordOverflow } from "../diagnoseRecordOverflow";

/** A record titled "User" over the given attribute rows, at the given height. */
const recordDoc = (height: number, attributes: string[]) => ({
	id: "user",
	type: "record",
	x: 0,
	y: 0,
	width: 180,
	height,
	text: {
		name: { text: "User" },
		attributes: { text: attributes },
	},
});

/** The height the record's compartments need, measured with the drawing's rule. */
const requiredHeightOf = (attributes: string[]): number =>
	calcRecordContentHeight(recordDoc(0, attributes));

const threeRows = ["- id: string", "- name: string", "- email: string"];

describe("diagnoseRecordOverflow", () => {
	it("reports nothing for a record exactly as tall as its rows need", () => {
		expect(
			diagnoseRecordOverflow(recordDoc(requiredHeightOf(threeRows), threeRows)),
		).toEqual([]);
	});

	it("names the shortfall and the two ways to fix it", () => {
		const requiredHeight = requiredHeightOf(threeRows);
		const height = requiredHeight - 35;
		expect(diagnoseRecordOverflow(recordDoc(height, threeRows))).toEqual([
			`rows overflow record 180x${height}: its compartments need ${requiredHeight}px but the box is ${height}px tall, 35px short, so the bottom rows are drawn past its edge; record_set_compartments refits the height to them, or resize_object it to height ${requiredHeight}`,
		]);
	});

	it("lets half a pixel of rounding through", () => {
		const requiredHeight = requiredHeightOf(threeRows);
		expect(
			diagnoseRecordOverflow(recordDoc(requiredHeight - 0.5, threeRows)),
		).toEqual([]);
		expect(
			diagnoseRecordOverflow(recordDoc(requiredHeight - 1, threeRows)),
		).toHaveLength(1);
	});

	it("counts an empty compartment as one row's worth", () => {
		const requiredHeight = requiredHeightOf([]);
		expect(requiredHeight).toBe(requiredHeightOf(["- id: string"]));
		expect(diagnoseRecordOverflow(recordDoc(requiredHeight, []))).toEqual([]);
		expect(
			diagnoseRecordOverflow(recordDoc(requiredHeight - 10, [])),
		).toHaveLength(1);
	});

	it("passes over a record taller than its rows need", () => {
		expect(diagnoseRecordOverflow(recordDoc(300, threeRows))).toEqual([]);
	});

	it("passes over a doc with no numeric height", () => {
		const { height: _height, ...heightless } = recordDoc(0, threeRows);
		expect(diagnoseRecordOverflow(heightless)).toEqual([]);
	});
});
