import { describe, it, expect } from "vitest";

import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { RectState } from "../../../states/objects/primitives/rect/RectState";
import { findLowestCommonAncestor } from "../findLowestCommonAncestor";

type Objects = Record<string, GroupState | RectState>;

const rect = (id: string, parentId?: string): RectState =>
	({ id, type: "rect", parentId }) as RectState;

const group = (id: string, childIds: string[], parentId?: string): GroupState =>
	({ id, type: "group", childIds, parentId }) as unknown as GroupState;

describe("findLowestCommonAncestor", () => {
	// ─── no common ancestor (root-level siblings) ────────────────────────────────

	it("root-level siblings have no common ancestor", () => {
		const objects: Objects = {
			"rect-1": rect("rect-1"),
			"rect-2": rect("rect-2"),
		};
		expect(
			findLowestCommonAncestor(["rect-1", "rect-2"], objects),
		).toBeUndefined();
	});

	it("returns undefined when passed an empty array", () => {
		expect(findLowestCommonAncestor([], {})).toBeUndefined();
	});

	// ─── siblings within the same group ─────────────────────────────────────────

	it("the LCA of siblings within the same group is that group", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1", "rect-2"]),
			"rect-1": rect("rect-1", "group-1"),
			"rect-2": rect("rect-2", "group-1"),
		};
		expect(findLowestCommonAncestor(["rect-1", "rect-2"], objects)).toBe(
			"group-1",
		);
	});

	// ─── different depths ────────────────────────────────────────────────────

	it("the LCA of a child and a grandchild is the common parent group", () => {
		// group-1
		//   ├─ rect-1
		//   └─ group-2
		//       └─ rect-2
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1", "group-2"]),
			"rect-1": rect("rect-1", "group-1"),
			"group-2": group("group-2", ["rect-2"], "group-1"),
			"rect-2": rect("rect-2", "group-2"),
		};
		expect(findLowestCommonAncestor(["rect-1", "rect-2"], objects)).toBe(
			"group-1",
		);
	});

	it("the LCA of elements in different subgroups is the common ancestor group", () => {
		// group-outer
		//   ├─ group-a
		//   │   └─ rect-a
		//   └─ group-b
		//       └─ rect-b
		const objects: Objects = {
			"group-outer": group("group-outer", ["group-a", "group-b"]),
			"group-a": group("group-a", ["rect-a"], "group-outer"),
			"rect-a": rect("rect-a", "group-a"),
			"group-b": group("group-b", ["rect-b"], "group-outer"),
			"rect-b": rect("rect-b", "group-b"),
		};
		expect(findLowestCommonAncestor(["rect-a", "rect-b"], objects)).toBe(
			"group-outer",
		);
	});

	// ─── one side is the LCA itself ───────────────────────────────────────────────

	it("the LCA of a group and an element inside it is that group's parent", () => {
		// group-outer
		//   └─ group-1
		//       └─ rect-1
		const objects: Objects = {
			"group-outer": group("group-outer", ["group-1"]),
			"group-1": group("group-1", ["rect-1"], "group-outer"),
			"rect-1": rect("rect-1", "group-1"),
		};
		// the LCA of group-1 and rect-1 (a child of group-1) is group-outer
		expect(findLowestCommonAncestor(["group-1", "rect-1"], objects)).toBe(
			"group-outer",
		);
	});

	// ─── three or more elements ────────────────────────────────────────────────

	it("returns the LCA of three elements", () => {
		// group-1
		//   ├─ rect-1
		//   ├─ rect-2
		//   └─ rect-3
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1", "rect-2", "rect-3"]),
			"rect-1": rect("rect-1", "group-1"),
			"rect-2": rect("rect-2", "group-1"),
			"rect-3": rect("rect-3", "group-1"),
		};
		expect(
			findLowestCommonAncestor(["rect-1", "rect-2", "rect-3"], objects),
		).toBe("group-1");
	});

	it("returns the deepest common ancestor across three levels of nesting", () => {
		// group-root
		//   └─ group-mid
		//       ├─ rect-1
		//       └─ rect-2
		const objects: Objects = {
			"group-root": group("group-root", ["group-mid"]),
			"group-mid": group("group-mid", ["rect-1", "rect-2"], "group-root"),
			"rect-1": rect("rect-1", "group-mid"),
			"rect-2": rect("rect-2", "group-mid"),
		};
		// the LCA is group-mid, not group-root (the deeper common ancestor)
		expect(findLowestCommonAncestor(["rect-1", "rect-2"], objects)).toBe(
			"group-mid",
		);
	});

	it("no common ancestor when one is root-level and the other is inside a group", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1"]),
			"rect-1": rect("rect-1", "group-1"),
			"rect-2": rect("rect-2"),
		};
		expect(
			findLowestCommonAncestor(["rect-1", "rect-2"], objects),
		).toBeUndefined();
	});
});
