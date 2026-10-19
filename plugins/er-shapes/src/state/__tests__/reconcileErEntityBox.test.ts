import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
	resetTextMeasurementForTests,
} from "@jiscribe/canvas-sdk/doc";
import { afterEach, describe, expect, it } from "vitest";

import { calcErEntityLayout } from "../../layout/calcErEntityLayout";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToDoc, erEntityToState } from "../ErEntityMapper";
import type { ErEntityState } from "../ErEntityState";
import { reconcileErEntityBox } from "../reconcileErEntityBox";

// Measured on the estimate (vitest.setup.ts): every character is 0.6 em wide.

/** 220 wide at the origin: key 24 (no keys), name 96, type 100; floors key 24, name 54 ("email"), type 60. */
const makeState = (fields: Partial<ErEntityDoc> = {}) =>
	erEntityToState({
		id: "e-1",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 96,
		typeWidth: 100,
		name: "users",
		columns: [{ name: "id" }, { name: "email" }],
		...fields,
	} as ErEntityDoc);

/** The state with one slot's text replaced, as an in-place edit grafts it. */
const withSlotText = (
	state: ErEntityState,
	slotId: string,
	text: string,
): ErEntityState => ({
	...state,
	text: { ...state.text, [slotId]: { text } },
});

/**
 * The state with a width written the way the core width handle writes one: the
 * box alone, the drawn corner on the side of `keptEdge` held.
 */
const withHandleWidth = (
	state: ErEntityState,
	width: number,
	keptEdge: "left" | "right" = "left",
): ErEntityState => {
	const left = state.cx - state.width / 2;
	const right = state.cx + state.width / 2;
	return {
		...state,
		width,
		cx: keptEdge === "left" ? left + width / 2 : right - width / 2,
	};
};

/** The three slot widths as the state is drawn. */
const drawnSlotWidths = (state: ErEntityState) => {
	const layout = calcErEntityLayout(state);
	return {
		key: layout.keyWidth,
		name: layout.nameWidth,
		type: layout.typeWidth,
	};
};

/** The three stated widths, which measurement never writes. */
const statedSlotWidths = (state: ErEntityState) => ({
	keyWidth: state.keyWidth,
	nameWidth: state.nameWidth,
	typeWidth: state.typeWidth,
});

const expectDrawnCornerAtOrigin = (state: ErEntityState) => {
	expect(state.cx - state.width / 2).toBeCloseTo(0);
	expect(state.cy - state.height / 2).toBeCloseTo(0);
};

describe("reconcileErEntityBox", () => {
	afterEach(() => {
		// Back to what vitest.setup.ts offers, for a test that swapped it.
		resetTextMeasurementForTests();
		offerTextMeasurement(createEstimateTextMeasurement());
	});

	it("hands back the same state when nothing moved", () => {
		const state = makeState();
		expect(reconcileErEntityBox(state)).toBe(state);
	});

	it("keeps the rows' height when a column's key gains the PK token", () => {
		const edited = reconcileErEntityBox(
			withSlotText(makeState(), "col:1:key", "PK"),
		);
		// "PK" is 16.8 wide, rounded up plus 12: the unstated gutter follows it,
		// which is not read as a width written from outside.
		expect(drawnSlotWidths(edited)).toEqual({ key: 29, name: 96, type: 100 });
		expect(statedSlotWidths(edited)).toEqual(statedSlotWidths(makeState()));
		expect(edited.width).toBe(225);
		expect(edited.height).toBe(28 + 25 + 25);
		expectDrawnCornerAtOrigin(edited);
	});

	it("keeps a style written to one column slot, its row alone growing", () => {
		const state = makeState();
		const styledSlot = { text: "id", fontSize: 30, fontStyle: "italic" };
		const edited = reconcileErEntityBox({
			...state,
			text: { ...state.text, "col:0:name": styledSlot },
		});
		expect(edited.text["col:0:name"]).toBe(styledSlot);
		expect(edited.height).toBe(28 + (30 * 1.5 + 4) + 25);
	});

	it("sizes every row from the size its texts state", () => {
		const state = makeState();
		const edited = reconcileErEntityBox({
			...state,
			text: Object.fromEntries(
				Object.entries(state.text).map(([slotId, slot]) => [
					slotId,
					{ ...slot, fontSize: 20 },
				]),
			),
		});
		expect(edited.height).toBe(30 + 7 + (30 + 4) * 2);
		expect(edited.text["col:0:name"]).toEqual({ text: "id", fontSize: 20 });
	});

	it("spreads a width written by a handle over the name and the type by their px, the key gutter kept", () => {
		const edited = reconcileErEntityBox(withHandleWidth(makeState(), 316));
		// 316 - 24 = 292 split 96 : 100.
		expect(drawnSlotWidths(edited)).toEqual({ key: 24, name: 143, type: 149 });
		expect(edited.nameWidth).toBe(143);
		expect(edited.typeWidth).toBe(149);
		expect(edited.width).toBe(316);
		expectDrawnCornerAtOrigin(edited);
	});

	it("keeps the right edge where a left handle put it, the width honoured", () => {
		const state = makeState();
		const right = state.cx + state.width / 2;
		const edited = reconcileErEntityBox(withHandleWidth(state, 180, "right"));
		expect(edited.width).toBe(180);
		expect(edited.cx + edited.width / 2).toBeCloseTo(right);
	});

	it("keeps a fractional handle width, the type taking the fraction", () => {
		const edited = reconcileErEntityBox(withHandleWidth(makeState(), 250.37));
		expect(edited.width).toBe(250.37);
		expect(edited.nameWidth).toBe(111);
		expect(edited.typeWidth).toBe(115.37);
	});

	it("pins a column at its floor and gives the other the rest", () => {
		// The type holds 72% of the row; at 160 the name's share (38) is under 54.
		const state = makeState({ nameWidth: 70, typeWidth: 180 });
		const edited = reconcileErEntityBox(withHandleWidth(state, 160));
		expect(drawnSlotWidths(edited)).toEqual({ key: 24, name: 54, type: 82 });
		expect(edited.width).toBe(160);
	});

	it("stops a handle width at the key gutter plus both floors", () => {
		const edited = reconcileErEntityBox(withHandleWidth(makeState(), 80));
		expect(drawnSlotWidths(edited)).toEqual({ key: 24, name: 54, type: 60 });
		expect(edited.width).toBe(24 + 54 + 60);
		expect(edited.minWidth).toBe(24 + 54 + 60);
		expectDrawnCornerAtOrigin(edited);
	});

	it("gives the name what three narrow slots fall short of 120", () => {
		const edited = reconcileErEntityBox(
			makeState({ columns: [{ name: "a" }], nameWidth: 24, typeWidth: 60 }),
		);
		expect(drawnSlotWidths(edited)).toEqual({ key: 24, name: 36, type: 60 });
		expect(edited.width).toBe(120);
		expect(edited.minWidth).toBe(120);
	});

	it("widens the box for a long column name, the type and the key gutter keeping their px", () => {
		// "a_very_long_column_name": 193.2, rounded up, plus 12.
		const edited = reconcileErEntityBox(
			withSlotText(makeState(), "col:0:name", "a_very_long_column_name"),
		);
		expect(drawnSlotWidths(edited)).toEqual({ key: 24, name: 206, type: 100 });
		expect(edited.width).toBe(24 + 206 + 100);
		expect(edited.derivedWidth).toBe(edited.width);
		// Measured, not stated: the stated width is kept as written.
		expect(edited.nameWidth).toBe(96);
		expectDrawnCornerAtOrigin(edited);
	});

	it("widens the box for a long type, the name keeping its px", () => {
		// "varchar(255) not null": 176.4, rounded up, plus 12.
		const edited = reconcileErEntityBox(
			withSlotText(makeState(), "col:1:type", "varchar(255) not null"),
		);
		expect(drawnSlotWidths(edited)).toEqual({ key: 24, name: 96, type: 189 });
		expect(edited.width).toBe(24 + 96 + 189);
		expect(statedSlotWidths(edited)).toEqual(statedSlotWidths(makeState()));
		expectDrawnCornerAtOrigin(edited);
	});

	it("widens an unstated key gutter to the widest key, the box with it and the rest kept", () => {
		// "PK, FK": 50.4, rounded up, plus 12.
		const edited = reconcileErEntityBox(
			withSlotText(makeState(), "col:0:key", "PK, FK"),
		);
		expect(drawnSlotWidths(edited)).toEqual({ key: 63, name: 96, type: 100 });
		expect(edited.width).toBe(63 + 96 + 100);
		expect(edited.derivedWidth).toBe(63 + 96 + 100);
		expect(edited).not.toHaveProperty("keyWidth");
		expect(edited.nameWidth).toBe(96);
		expect(edited.typeWidth).toBe(100);
		expectDrawnCornerAtOrigin(edited);
	});

	it("draws a stated key gutter at the widest key, the box with it, the stated width kept", () => {
		const edited = reconcileErEntityBox(
			withSlotText(makeState({ keyWidth: 24 }), "col:0:key", "PK, FK"),
		);
		expect(edited.keyWidth).toBe(24);
		expect(edited.width).toBe(220 + 63 - 24);
		expect(drawnSlotWidths(edited)).toEqual({ key: 63, name: 96, type: 100 });
		expectDrawnCornerAtOrigin(edited);
	});

	it("narrows a column back to its stated width when a text gets shorter", () => {
		const state = makeState();
		const widened = reconcileErEntityBox(
			withSlotText(state, "col:0:name", "a_very_long_column_name"),
		);
		const shortened = reconcileErEntityBox(
			withSlotText(widened, "col:0:name", "id"),
		);
		expect(widened.width).toBeGreaterThan(state.width);
		expect(shortened.width).toBe(state.width);
		expect(drawnSlotWidths(shortened)).toEqual(drawnSlotWidths(state));
		expect(statedSlotWidths(shortened)).toEqual(statedSlotWidths(state));
		expect(shortened.minWidth).toBeLessThan(widened.minWidth ?? 0);
	});

	it("re-fits from the texts when the measurement changes, the stated widths kept", () => {
		// Built under a wide fallback face: the long name widens its column.
		resetTextMeasurementForTests();
		offerTextMeasurement(createEstimateTextMeasurement(0.9));
		const underFallback = reconcileErEntityBox(
			withSlotText(makeState(), "col:0:name", "a_long_column_name"),
		);
		// "a_long_column_name": 18 × 12.6 = 226.8, rounded up, plus 12.
		expect(drawnSlotWidths(underFallback).name).toBe(239);

		// The real face arrives, narrower: 18 × 8.4 = 151.2, rounded up, plus 12.
		resetTextMeasurementForTests();
		offerTextMeasurement(createEstimateTextMeasurement());
		const refitted = reconcileErEntityBox(underFallback);
		expect(drawnSlotWidths(refitted).name).toBe(164);
		expect(refitted.width).toBe(underFallback.width - (239 - 164));
		expect(statedSlotWidths(refitted)).toEqual(statedSlotWidths(makeState()));
		expect(reconcileErEntityBox(refitted)).toBe(refitted);
	});

	it("hands back the same state for stated widths that already fit", () => {
		const state = makeState({ keyWidth: 40, nameWidth: 80, typeWidth: 90 });
		expect(reconcileErEntityBox(state)).toBe(state);
	});

	it("hands back the same object on a second run, every slot at least its floor", () => {
		const longTexts = [
			["col:0:name", "a_very_long_column_name"],
			["col:1:type", "varchar(255) not null"],
			["col:0:key", "PK, FK, UK"],
		] as const;
		for (const keyWidth of [undefined, 24, 31.3333]) {
			for (const [nameWidth, typeWidth] of [
				[96, 100],
				[24, 60],
				[54.5, 300],
				[400, 61.25],
			]) {
				for (let width = 60; width < 520; width += 7.37) {
					for (const [slotId, text] of [["col:0:name", "id"], ...longTexts]) {
						const state = withSlotText(
							withHandleWidth(
								makeState({
									nameWidth,
									typeWidth,
									...(keyWidth !== undefined && { keyWidth }),
								}),
								width,
							),
							slotId,
							text,
						);
						const once = reconcileErEntityBox(state);
						// A fixed point after one pass: a second pass, and a third
						// after a pass on a copy, change nothing, so nothing oscillates.
						expect(reconcileErEntityBox(once)).toBe(once);
						const copied = { ...once };
						expect(reconcileErEntityBox(copied)).toBe(copied);
						expect(once.width).toBeGreaterThanOrEqual(once.minWidth ?? 0);
						expect(once.derivedWidth).toBe(once.width);
						const layout = calcErEntityLayout(once);
						const floors = layout.slotFloors;
						expect(layout.keyWidth).toBeGreaterThanOrEqual(floors.keyWidth);
						expect(layout.nameWidth).toBeGreaterThanOrEqual(floors.nameWidth);
						expect(layout.typeWidth).toBeGreaterThanOrEqual(floors.typeWidth);
						expect(once.width).toBeCloseTo(
							layout.keyWidth + layout.nameWidth + layout.typeWidth,
							6,
						);
						// The handle's width is honoured where the floors allow,
						// written as stated name and type widths drawn as given.
						expect(once.width).toBeCloseTo(
							Math.max(width, once.minWidth ?? 0),
							4,
						);
						expect(layout.nameWidth).toBe(once.nameWidth);
						expect(layout.typeWidth).toBe(once.typeWidth);
						expect(once.keyWidth).toBe(keyWidth);
					}
				}
			}
		}
	});

	it("comes back unchanged from the document its result is saved as", () => {
		const edited = reconcileErEntityBox(
			withSlotText(
				withHandleWidth(makeState({ keyWidth: 31.3333 }), 287.123),
				"col:1:type",
				"varchar(255) not null",
			),
		);
		const reloaded = erEntityToState(erEntityToDoc(edited));
		expect(reconcileErEntityBox(reloaded)).toBe(reloaded);
		expect(reloaded.width).toBe(edited.width);
		expect(reloaded.nameWidth).toBe(edited.nameWidth);
		expect(reloaded.typeWidth).toBe(edited.typeWidth);
		expect(reloaded.keyWidth).toBe(edited.keyWidth);
	});
});
