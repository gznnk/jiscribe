import { isNumber } from "@jiscribe/basic-validators";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { getFirstSelectedPropValue } from "../getFirstSelectedPropValue";

const rect = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "rect", ...extra }) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

describe("getFirstSelectedPropValue", () => {
	it("selectedIds is empty -> undefined", () => {
		expect(getFirstSelectedPropValue([], {}, "rx", isNumber)).toBeUndefined();
	});

	it("has the property -> its value", () => {
		const objects = { r1: rect("r1", { rx: 12 }) };
		expect(getFirstSelectedPropValue(["r1"], objects, "rx", isNumber)).toBe(12);
	});

	it("value of another type -> undefined", () => {
		const objects = { r1: rect("r1", { rx: "round" }) };
		expect(
			getFirstSelectedPropValue(["r1"], objects, "rx", isNumber),
		).toBeUndefined();
	});

	it("group itself lacks the property but a descendant has it -> the descendant's value", () => {
		const child = rect("child", { rx: 8 });
		const objects = {
			g1: group("g1", ["child"]) as unknown as ObjectState,
			child,
		};
		expect(getFirstSelectedPropValue(["g1"], objects, "rx", isNumber)).toBe(8);
	});
});
