import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTextSlotPartRegistry } from "../../../../selection/__tests__/support/textSlotPartRegistry";
import { TEXT_SLOT_PART_KIND } from "../../../../selection/textSlotPartKind";
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
		objectPartSelection: null,
		activeDrag: null,
		...overrides,
	}) as unknown as CanvasControllerState;

/** Every range a Tab step writes is collapsed, so one id names the whole selection. */
const selectedSlotId = (state: CanvasControllerState): string | undefined =>
	state.objectPartSelection?.ranges[0].anchorId;

/** The registry a canvas holds once "record" has been applied. */
const objectPartKind = createTextSlotPartRegistry("record");

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
			getTextSlotCycleTarget(baseState({ activeDrag: { foo: 1 } as never })),
		).toBeNull();
	});
});

describe("selectAdjacentTextSlot", () => {
	it("enters at the first slot going forward and the last going backward", () => {
		expect(
			selectedSlotId(selectAdjacentTextSlot(baseState({}), 1, objectPartKind)),
		).toBe("name");
		expect(
			selectedSlotId(selectAdjacentTextSlot(baseState({}), -1, objectPartKind)),
		).toBe("operations");
	});

	it("walks the slots in key order", () => {
		const first = selectAdjacentTextSlot(baseState({}), 1, objectPartKind);
		const second = selectAdjacentTextSlot(first, 1, objectPartKind);
		const third = selectAdjacentTextSlot(second, 1, objectPartKind);
		expect([first, second, third].map(selectedSlotId)).toEqual([
			"name",
			"attributes",
			"operations",
		]);
	});

	it("wraps around at either end", () => {
		const atLast = baseState({
			objectPartSelection: {
				objectId: "rec-1",
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "operations", focusId: "operations" }],
			},
		});
		expect(
			selectedSlotId(selectAdjacentTextSlot(atLast, 1, objectPartKind)),
		).toBe("name");

		const atFirst = baseState({
			objectPartSelection: {
				objectId: "rec-1",
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "name", focusId: "name" }],
			},
		});
		expect(
			selectedSlotId(selectAdjacentTextSlot(atFirst, -1, objectPartKind)),
		).toBe("operations");
	});

	it("collapses a range and steps off the end it is travelling towards", () => {
		const rangeOf = (anchorId: string, focusId: string) =>
			baseState({
				objectPartSelection: {
					objectId: "rec-1",
					kind: TEXT_SLOT_PART_KIND,
					ranges: [{ anchorId, focusId }],
				},
			});
		// Forward leaves from the last of the range, backward from the first.
		expect(
			selectedSlotId(
				selectAdjacentTextSlot(
					rangeOf("name", "attributes"),
					1,
					objectPartKind,
				),
			),
		).toBe("operations");
		expect(
			selectedSlotId(
				selectAdjacentTextSlot(
					rangeOf("operations", "attributes"),
					-1,
					objectPartKind,
				),
			),
		).toBe("name");
	});

	it("treats a stale slot selection as none selected", () => {
		// The slot names an object that is not the selection, so it does not decide the start.
		const state = baseState({
			objectPartSelection: {
				objectId: "other",
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "operations", focusId: "operations" }],
			},
		});
		expect(
			selectedSlotId(selectAdjacentTextSlot(state, 1, objectPartKind)),
		).toBe("name");
	});

	it("closes an open ObjectMenu submenu, which no longer acts on the slot walked away from", () => {
		const state = baseState({ objectMenuOpenId: "alignment" });
		expect(
			selectAdjacentTextSlot(state, 1, objectPartKind).objectMenuOpenId,
		).toBeNull();
	});

	it("leaves a state whose selection does not qualify untouched", () => {
		const state = baseState({ selectedIds: [] });
		expect(selectAdjacentTextSlot(state, 1, objectPartKind)).toBe(state);
	});

	it("leaves an object that declares no slot at all untouched", () => {
		const state = baseState({
			objects: {
				"rec-1": { ...recordObject, text: {} },
			} as never,
		});
		expect(selectAdjacentTextSlot(state, 1, objectPartKind)).toBe(state);
	});
});
