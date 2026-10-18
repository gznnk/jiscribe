import { advanceTextMeasurementGeneration } from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import type { ErEntityState } from "../../state/ErEntityState";
import { reconcileErEntityBox } from "../../state/reconcileErEntityBox";
import { calcErEntityLayout } from "../calcErEntityLayout";
import { readCachedErEntityLayout } from "../readCachedErEntityLayout";

const makeState = (): ErEntityState =>
	erEntityToState({
		id: "e-1",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 96,
		typeWidth: 100,
		name: "users",
		columns: [{ key: "PK", name: "id" }, { name: "email" }],
	} as ErEntityDoc);

describe("readCachedErEntityLayout", () => {
	it("lays an entity out as calcErEntityLayout does", () => {
		const state = makeState();
		expect(readCachedErEntityLayout(state)).toEqual(calcErEntityLayout(state));
	});

	it("hands back the same layout for a state moved, rotated or reselected, the slots untouched", () => {
		const state = makeState();
		const layout = readCachedErEntityLayout(state);
		const moved: ErEntityState = { ...state, cx: 500, rotation: 30 };
		expect(readCachedErEntityLayout(moved)).toBe(layout);
		expect(readCachedErEntityLayout(state)).toBe(layout);
	});

	it("is the layout the state the mapper built is drawn with, measured once", () => {
		const state = makeState();
		expect(readCachedErEntityLayout(state)).toBe(
			readCachedErEntityLayout({ ...state }),
		);
	});

	it("is the layout the content resizer derived its result from", () => {
		const state = makeState();
		const resized = reconcileErEntityBox({ ...state, width: 300 });
		const layout = readCachedErEntityLayout(resized);
		expect(layout.width).toBe(resized.width);
		const moved: ErEntityState = { ...resized, cy: 9 };
		expect(readCachedErEntityLayout(moved)).toBe(layout);
	});

	it("lays out afresh when a text changes", () => {
		const state = makeState();
		const layout = readCachedErEntityLayout(state);
		const edited = {
			...state,
			text: { ...state.text, "col:1:name": { text: "a_long_column_name" } },
		};
		expect(readCachedErEntityLayout(edited)).not.toBe(layout);
		expect(readCachedErEntityLayout(edited).nameWidth).toBeGreaterThan(
			layout.nameWidth,
		);
	});

	it("lays out afresh when a stated width changes, the slots shared", () => {
		const state = makeState();
		const layout = readCachedErEntityLayout(state);
		const widened = { ...state, nameWidth: 140 };
		expect(readCachedErEntityLayout(widened).nameWidth).toBe(140);
		const keyed = { ...state, keyWidth: 50 };
		expect(readCachedErEntityLayout(keyed).keyWidth).toBe(50);
		// The two most recent widths of the same slots are both kept.
		expect(readCachedErEntityLayout(keyed)).toBe(
			readCachedErEntityLayout(keyed),
		);
		expect(readCachedErEntityLayout(widened).nameWidth).toBe(140);
		expect(readCachedErEntityLayout(state)).toEqual(layout);
	});

	it("lays out afresh when a slot's typography changes", () => {
		const state = makeState();
		const layout = readCachedErEntityLayout(state);
		const restyled: ErEntityState = {
			...state,
			text: {
				...state.text,
				"col:1:name": { text: "email", fontSize: 20 },
			},
		};
		expect(readCachedErEntityLayout(restyled)).not.toBe(layout);
		expect(readCachedErEntityLayout(restyled).height).toBe(28 + 25 + 34);
	});

	it("lays out afresh once the measurement generation moves on", () => {
		const state = makeState();
		const layout = readCachedErEntityLayout(state);
		advanceTextMeasurementGeneration();
		const remeasured = readCachedErEntityLayout(state);
		expect(remeasured).not.toBe(layout);
		expect(remeasured).toEqual(layout);
		expect(readCachedErEntityLayout(state)).toBe(remeasured);
	});

	it("computes every time for an input with no slots", () => {
		const input = { nameWidth: 96, typeWidth: 100 };
		expect(readCachedErEntityLayout(input)).not.toBe(
			readCachedErEntityLayout(input),
		);
	});
});
