import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { buildSelectedIdsWithDescendants } from "../buildSelectedIdsWithDescendants";

const rect = (id: string): ObjectState => ({ id, type: "rect" }) as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

describe("buildSelectedIdsWithDescendants", () => {
	it("empty selectedIds -> empty Set", () => {
		const result = buildSelectedIdsWithDescendants([], {});
		expect(result.size).toBe(0);
	});

	it("no groups -> Set matching selectedIds as-is", () => {
		const objects = { r1: rect("r1"), r2: rect("r2") };
		const result = buildSelectedIdsWithDescendants(["r1", "r2"], objects);
		expect(result).toEqual(new Set(["r1", "r2"]));
	});

	it("includes a group -> group plus all descendants are included", () => {
		const objects: Record<string, ObjectState> = {
			g1: group("g1", ["r1", "r2"]) as unknown as ObjectState,
			r1: rect("r1"),
			r2: rect("r2"),
		};
		const result = buildSelectedIdsWithDescendants(["g1"], objects);
		expect(result.has("g1")).toBe(true);
		expect(result.has("r1")).toBe(true);
		expect(result.has("r2")).toBe(true);
		expect(result.size).toBe(3);
	});

	it("nested groups -> all descendants down to the deepest are included", () => {
		const objects: Record<string, ObjectState> = {
			g1: group("g1", ["g2"]) as unknown as ObjectState,
			g2: group("g2", ["r1"]) as unknown as ObjectState,
			r1: rect("r1"),
		};
		const result = buildSelectedIdsWithDescendants(["g1"], objects);
		expect(result).toEqual(new Set(["g1", "g2", "r1"]));
	});

	it("mix of groups and non-groups -> all are included", () => {
		const objects: Record<string, ObjectState> = {
			g1: group("g1", ["r2"]) as unknown as ObjectState,
			r1: rect("r1"),
			r2: rect("r2"),
		};
		const result = buildSelectedIdsWithDescendants(["r1", "g1"], objects);
		expect(result).toEqual(new Set(["r1", "g1", "r2"]));
	});

	it("return value is a ReadonlySet (not writable)", () => {
		const result = buildSelectedIdsWithDescendants(["r1"], { r1: rect("r1") });
		// ReadonlySet at the TypeScript type level, but a Set at runtime, so only check size
		expect(result.size).toBe(1);
	});
});
