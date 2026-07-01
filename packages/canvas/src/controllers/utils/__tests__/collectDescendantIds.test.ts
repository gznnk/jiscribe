import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { RectState } from "../../../states/objects/primitives/rect/RectState";
import { collectDescendantIds } from "../collectDescendantIds";

// object map type used in tests
type Objects = Record<string, ObjectState>;

const rect = (id: string, parentId?: string): RectState =>
	({ id, type: "rect", parentId }) as RectState;

const group = (id: string, childIds: string[], parentId?: string): GroupState =>
	({ id, type: "group", childIds, parentId }) as unknown as GroupState;

describe("collectDescendantIds", () => {
	// ─── basic cases ────────────────────────────────────────────────

	it("returns an empty array for a non-group object", () => {
		const objects: Objects = { "rect-1": rect("rect-1") };
		expect(collectDescendantIds("rect-1", objects)).toEqual([]);
	});

	it("returns an empty array for a nonexistent ID", () => {
		expect(collectDescendantIds("nonexistent", {})).toEqual([]);
	});

	it("a group with empty childIds returns an empty array", () => {
		const objects: Objects = { "group-1": group("group-1", []) };
		expect(collectDescendantIds("group-1", objects)).toEqual([]);
	});

	it("returns the direct children (non-group)", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1", "rect-2"]),
			"rect-1": rect("rect-1", "group-1"),
			"rect-2": rect("rect-2", "group-1"),
		};
		const result = collectDescendantIds("group-1", objects);
		expect(result).toContain("rect-1");
		expect(result).toContain("rect-2");
		expect(result).toHaveLength(2);
	});

	// ─── nesting ────────────────────────────────────────────────────

	it("returns all group and non-group descendants across two levels of nesting", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["group-2", "rect-1"]),
			"group-2": group("group-2", ["rect-2", "rect-3"], "group-1"),
			"rect-1": rect("rect-1", "group-1"),
			"rect-2": rect("rect-2", "group-2"),
			"rect-3": rect("rect-3", "group-2"),
		};
		const result = collectDescendantIds("group-1", objects);
		expect(result).toContain("group-2");
		expect(result).toContain("rect-1");
		expect(result).toContain("rect-2");
		expect(result).toContain("rect-3");
		expect(result).toHaveLength(4);
	});

	it("returns all descendants even across three levels of nesting", () => {
		const objects: Objects = {
			g1: group("g1", ["g2"]),
			g2: group("g2", ["g3"], "g1"),
			g3: group("g3", ["rect-1"], "g2"),
			"rect-1": rect("rect-1", "g3"),
		};
		const result = collectDescendantIds("g1", objects);
		expect(result).toContain("g2");
		expect(result).toContain("g3");
		expect(result).toContain("rect-1");
		expect(result).toHaveLength(3);
	});

	it("the root ID is not included in the result", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1"]),
			"rect-1": rect("rect-1", "group-1"),
		};
		const result = collectDescendantIds("group-1", objects);
		expect(result).not.toContain("group-1");
	});

	// ─── accumulator ──────────────────────────────────────────────

	it("appends to an existing result array when one is passed (API compatibility)", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["rect-2"]),
			"rect-2": rect("rect-2", "group-1"),
		};
		const existing = ["rect-1"];
		const result = collectDescendantIds("group-1", objects, existing);
		expect(result).toEqual(["rect-1", "rect-2"]);
		expect(result).toBe(existing); // returns a reference to the same array
	});
});
