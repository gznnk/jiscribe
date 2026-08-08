import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { TextSlots } from "../../../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { getSelectedOrFirstTextSlot } from "../getSelectedOrFirstTextSlot";

const rect = (id: string, text?: TextSlots): ObjectState =>
	({
		id,
		type: "rect",
		features: { text: "slots" },
		...(text ? { text } : {}),
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const makeState = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	selectedTextSlot: CanvasControllerState["selectedTextSlot"] = null,
): CanvasControllerState =>
	({
		selectedIds,
		objects,
		selectedTextSlot,
	}) as unknown as CanvasControllerState;

describe("getSelectedOrFirstTextSlot", () => {
	it("returns undefined when nothing is selected", () => {
		expect(getSelectedOrFirstTextSlot(makeState([], {}))).toBeUndefined();
	});

	it("returns undefined when nothing selected holds text", () => {
		const r = rect("r1");
		expect(
			getSelectedOrFirstTextSlot(makeState(["r1"], { r1: r })),
		).toBeUndefined();
	});

	it("returns the body slot of a single-slot shape", () => {
		const r = rect("r1", { body: { text: "hello", fontSize: 20 } });
		expect(getSelectedOrFirstTextSlot(makeState(["r1"], { r1: r }))).toEqual({
			text: "hello",
			fontSize: 20,
		});
	});

	it("returns the first slot of a multi-slot shape, matching the editing default", () => {
		const r = rect("r1", {
			name: { text: "User", fontWeight: "bold" },
			rows: { text: ["id"], fontWeight: "normal" },
		});
		expect(
			getSelectedOrFirstTextSlot(makeState(["r1"], { r1: r }))?.fontWeight,
		).toBe("bold");
	});

	it("takes the first selected object that holds text", () => {
		const textless = rect("r1");
		const withText = rect("r2", { body: { text: "hello", fontSize: 20 } });
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1", "r2"], { r1: textless, r2: withText }),
			),
		).toEqual({ text: "hello", fontSize: 20 });
	});

	it("descends into a selected group", () => {
		const g = group("g1", ["r1"]);
		const r = rect("r1", { body: { text: "hello", fontSize: 20 } });
		expect(
			getSelectedOrFirstTextSlot(makeState(["g1"], { g1: g, r1: r })),
		).toEqual({ text: "hello", fontSize: 20 });
	});

	it("returns undefined for a shape whose slot map is empty", () => {
		const r = rect("r1", {});
		expect(
			getSelectedOrFirstTextSlot(makeState(["r1"], { r1: r })),
		).toBeUndefined();
	});

	it("returns the selected slot rather than the first one", () => {
		const r = rect("r1", {
			name: { text: "User", fontSize: 16 },
			rows: { text: ["id"], fontSize: 11 },
		});
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1: r }, { objectId: "r1", slotId: "rows" }),
			)?.fontSize,
		).toBe(11);
	});

	it("falls back to the first slot when the slot selection is stale", () => {
		const r1 = rect("r1", {
			name: { text: "User", fontSize: 16 },
			rows: { text: ["id"], fontSize: 11 },
		});
		const r2 = rect("r2", { body: { text: "other", fontSize: 30 } });
		// The slot's object is no longer the sole selection
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1", "r2"], { r1, r2 }, { objectId: "r1", slotId: "rows" }),
			)?.fontSize,
		).toBe(16);
		// The slot itself is gone from the object
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1 }, { objectId: "r1", slotId: "operations" }),
			)?.fontSize,
		).toBe(16);
	});
});
