import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import {
	getTextSlotCycleTarget,
	selectAdjacentTextSlot,
} from "../selectAdjacentTextSlot";

/** Slot order is the key order of `text`: name → attributes → operations. */
const recordObject = {
	id: "rec-1",
	type: "record",
	features: { text: "slots" },
	text: {
		name: { text: "User" },
		attributes: { text: [] },
		operations: { text: [] },
	},
};

const baseState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		objects: { "rec-1": recordObject },
		selectedIds: ["rec-1"],
		selectedTextSlot: null,
		eventStartSnapshot: null,
		...overrides,
	}) as unknown as CanvasControllerState;

const selectedSlotId = (state: CanvasControllerState): string | undefined =>
	state.selectedTextSlot?.slotId;

describe("getTextSlotCycleTarget", () => {
	it("returns the sole selected object when it spells its text out as slots", () => {
		expect(getTextSlotCycleTarget(baseState({}))?.id).toBe("rec-1");
	});

	it("returns null for a multiple selection", () => {
		expect(
			getTextSlotCycleTarget(baseState({ selectedIds: ["rec-1", "rec-2"] })),
		).toBeNull();
	});

	it("returns null when nothing is selected", () => {
		expect(getTextSlotCycleTarget(baseState({ selectedIds: [] }))).toBeNull();
	});

	it("returns null for a shape whose text is a single body", () => {
		const state = baseState({
			objects: {
				"rect-1": {
					id: "rect-1",
					type: "rect",
					features: { text: "body" },
					text: { body: { text: "hello" } },
				},
			} as never,
			selectedIds: ["rect-1"],
		});
		expect(getTextSlotCycleTarget(state)).toBeNull();
	});

	it("returns null during a drag", () => {
		expect(
			getTextSlotCycleTarget(
				baseState({ eventStartSnapshot: { foo: 1 } as never }),
			),
		).toBeNull();
	});
});

describe("selectAdjacentTextSlot", () => {
	it("enters at the first slot going forward and the last going backward", () => {
		expect(selectedSlotId(selectAdjacentTextSlot(baseState({}), 1))).toBe(
			"name",
		);
		expect(selectedSlotId(selectAdjacentTextSlot(baseState({}), -1))).toBe(
			"operations",
		);
	});

	it("walks the slots in key order", () => {
		const first = selectAdjacentTextSlot(baseState({}), 1);
		const second = selectAdjacentTextSlot(first, 1);
		const third = selectAdjacentTextSlot(second, 1);
		expect([first, second, third].map(selectedSlotId)).toEqual([
			"name",
			"attributes",
			"operations",
		]);
	});

	it("wraps around at either end", () => {
		const atLast = baseState({
			selectedTextSlot: { objectId: "rec-1", slotId: "operations" },
		});
		expect(selectedSlotId(selectAdjacentTextSlot(atLast, 1))).toBe("name");

		const atFirst = baseState({
			selectedTextSlot: { objectId: "rec-1", slotId: "name" },
		});
		expect(selectedSlotId(selectAdjacentTextSlot(atFirst, -1))).toBe(
			"operations",
		);
	});

	it("treats a stale slot selection as none selected", () => {
		// The slot names an object that is not the selection, so it does not decide the start.
		const state = baseState({
			selectedTextSlot: { objectId: "other", slotId: "operations" },
		});
		expect(selectedSlotId(selectAdjacentTextSlot(state, 1))).toBe("name");
	});

	it("leaves a state whose selection does not qualify untouched", () => {
		const state = baseState({ selectedIds: [] });
		expect(selectAdjacentTextSlot(state, 1)).toBe(state);
	});

	it("leaves an object that declares no slot at all untouched", () => {
		const state = baseState({
			objects: {
				"rec-1": { ...recordObject, text: {} },
			} as never,
		});
		expect(selectAdjacentTextSlot(state, 1)).toBe(state);
	});
});
