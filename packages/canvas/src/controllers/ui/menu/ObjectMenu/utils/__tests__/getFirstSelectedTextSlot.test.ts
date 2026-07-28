import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { TextSlots } from "../../../../../../states/objects/types/TextSlots";
import { getFirstSelectedTextSlot } from "../getFirstSelectedTextSlot";

const rect = (id: string, text?: TextSlots): ObjectState =>
	({ id, type: "rect", ...(text ? { text } : {}) }) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

describe("getFirstSelectedTextSlot", () => {
	it("returns undefined when nothing is selected", () => {
		expect(getFirstSelectedTextSlot([], {})).toBeUndefined();
	});

	it("returns undefined when nothing selected holds text", () => {
		const r = rect("r1");
		expect(getFirstSelectedTextSlot(["r1"], { r1: r })).toBeUndefined();
	});

	it("returns the body slot of a single-slot shape", () => {
		const r = rect("r1", { body: { text: "hello", fontSize: 20 } });
		expect(getFirstSelectedTextSlot(["r1"], { r1: r })).toEqual({
			text: "hello",
			fontSize: 20,
		});
	});

	it("returns the first slot of a multi-slot shape, matching the editing default", () => {
		const r = rect("r1", {
			name: { text: "User", fontWeight: "bold" },
			rows: { text: ["id"], fontWeight: "normal" },
		});
		expect(getFirstSelectedTextSlot(["r1"], { r1: r })?.fontWeight).toBe(
			"bold",
		);
	});

	it("takes the first selected object that holds text", () => {
		const textless = rect("r1");
		const withText = rect("r2", { body: { text: "hello", fontSize: 20 } });
		expect(
			getFirstSelectedTextSlot(["r1", "r2"], { r1: textless, r2: withText }),
		).toEqual({ text: "hello", fontSize: 20 });
	});

	it("descends into a selected group", () => {
		const g = group("g1", ["r1"]);
		const r = rect("r1", { body: { text: "hello", fontSize: 20 } });
		expect(getFirstSelectedTextSlot(["g1"], { g1: g, r1: r })).toEqual({
			text: "hello",
			fontSize: 20,
		});
	});

	it("returns undefined for a shape whose slot map is empty", () => {
		const r = rect("r1", {});
		expect(getFirstSelectedTextSlot(["r1"], { r1: r })).toBeUndefined();
	});
});
