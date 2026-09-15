import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { getFirstSelectedWithStyleGroup } from "../getFirstSelectedWithStyleGroup";

const rect = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "rect", ...extra }) as unknown as ObjectState;

const group = (
	id: string,
	childIds: string[],
	extra?: Record<string, unknown>,
): GroupState =>
	({
		id,
		type: "group",
		childIds,
		...extra,
	}) as unknown as GroupState;

/** A shape declaring both style groups, the way a rect's features do. */
const styledFeatures = {
	type: "rect",
	geometry: "rect",
	stroke: true,
	fill: true,
};

describe("getFirstSelectedWithStyleGroup", () => {
	it("selectedIds is empty -> undefined", () => {
		expect(getFirstSelectedWithStyleGroup([], {}, "fill")).toBeUndefined();
	});

	it("finds the object by its declaration, not by the field being written", () => {
		const bare = rect("r1", { features: styledFeatures });
		expect(getFirstSelectedWithStyleGroup(["r1"], { r1: bare }, "fill")).toBe(
			bare,
		);
	});

	it("skips an object whose type does not enable the group", () => {
		const strokeOnly = rect("r1", {
			fill: "#fff",
			features: { type: "polyline", geometry: "poly", stroke: true },
		});
		expect(
			getFirstSelectedWithStyleGroup(["r1"], { r1: strokeOnly }, "fill"),
		).toBeUndefined();
	});

	it("skips an object carrying no features at all", () => {
		const featureless = rect("r1", { fill: "#fff" });
		expect(
			getFirstSelectedWithStyleGroup(["r1"], { r1: featureless }, "fill"),
		).toBeUndefined();
	});

	it("skips nonexistent IDs and looks at the next one", () => {
		const r2 = rect("r2", { features: styledFeatures });
		expect(
			getFirstSelectedWithStyleGroup(["missing", "r2"], { r2 }, "fill"),
		).toBe(r2);
	});

	it("group itself declares nothing but a descendant does -> returns the descendant", () => {
		const child = rect("child", { features: styledFeatures });
		const g = group("g1", ["child"]);
		const objects = { g1: g as unknown as ObjectState, child };
		expect(getFirstSelectedWithStyleGroup(["g1"], objects, "fill")).toBe(child);
	});

	it("with multiple selected, returns the first match in selectedIds order", () => {
		const r1 = rect("r1", { features: styledFeatures });
		const r2 = rect("r2", { features: styledFeatures });
		expect(
			getFirstSelectedWithStyleGroup(["r1", "r2"], { r1, r2 }, "fill"),
		).toBe(r1);
	});

	it("answers each group on its own", () => {
		const strokeOnly = rect("r1", {
			features: { type: "polyline", geometry: "poly", stroke: true },
		});
		const objects = { r1: strokeOnly };
		expect(getFirstSelectedWithStyleGroup(["r1"], objects, "stroke")).toBe(
			strokeOnly,
		);
		expect(
			getFirstSelectedWithStyleGroup(["r1"], objects, "fill"),
		).toBeUndefined();
	});
});
