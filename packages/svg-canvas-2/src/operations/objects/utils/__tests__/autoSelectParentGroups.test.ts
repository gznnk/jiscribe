import { describe, it, expect } from "vitest";

import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { EllipseState } from "../../../../states/objects/primitives/EllipseState";
import type { GroupState } from "../../../../states/objects/primitives/GroupState";
import type { RectState } from "../../../../states/objects/primitives/RectState";
import { autoSelectParentGroups } from "../autoSelectParentGroups";

describe("autoSelectParentGroups", () => {
	it("should select parent group when all children are selected", () => {
		const state = {
			objects: {
				"group-1": {
					id: "group-1",
					type: "group",
					childIds: ["rect-1", "rect-2"],
				} as GroupState,
				"rect-1": {
					id: "rect-1",
					type: "rect",
					parentId: "group-1",
				} as RectState,
				"rect-2": {
					id: "rect-2",
					type: "rect",
					parentId: "group-1",
				} as RectState,
			},
		} as unknown as CanvasState;

		const result = autoSelectParentGroups(state, ["rect-1", "rect-2"]);

		expect(result).toEqual(["group-1"]);
	});

	it("should not select parent group when only some children are selected", () => {
		const state = {
			objects: {
				"group-1": {
					id: "group-1",
					type: "group",
					childIds: ["rect-1", "rect-2", "rect-3"],
				} as GroupState,
				"rect-1": {
					id: "rect-1",
					type: "rect",
					parentId: "group-1",
				} as RectState,
				"rect-2": {
					id: "rect-2",
					type: "rect",
					parentId: "group-1",
				} as RectState,
				"rect-3": {
					id: "rect-3",
					type: "rect",
					parentId: "group-1",
				} as RectState,
			},
		} as unknown as CanvasState;

		const result = autoSelectParentGroups(state, ["rect-1", "rect-2"]);

		expect(result).toEqual(["rect-1", "rect-2"]);
	});

	it("should handle nested groups correctly", () => {
		const state = {
			objects: {
				"group-1": {
					id: "group-1",
					type: "group",
					childIds: ["group-2", "rect-3"],
				} as GroupState,
				"group-2": {
					id: "group-2",
					type: "group",
					parentId: "group-1",
					childIds: ["rect-1", "rect-2"],
				} as GroupState,
				"rect-1": {
					id: "rect-1",
					type: "rect",
					parentId: "group-2",
				} as RectState,
				"rect-2": {
					id: "rect-2",
					type: "rect",
					parentId: "group-2",
				} as RectState,
				"rect-3": {
					id: "rect-3",
					type: "rect",
					parentId: "group-1",
				} as RectState,
			},
		} as unknown as CanvasState;

		// Select all children of group-2 and rect-3
		const result = autoSelectParentGroups(state, [
			"rect-1",
			"rect-2",
			"rect-3",
		]);

		// Should select group-1 only, not both group-1 and group-2
		expect(result).toEqual(["group-1"]);
	});

	it("should handle the issue: group with mixed nested group and non-grouped objects", () => {
		// This reproduces the bug with group-2 structure:
		// group-2
		//   ├─ rect-in-group-2
		//   ├─ ellipse-in-group-2
		//   ├─ nested-group-in-group-2
		//   │   ├─ rect-in-nested-group-2
		//   │   └─ ellipse-in-nested-group-2
		//   └─ rect-in-group-2-b

		const state = {
			objects: {
				"group-2": {
					id: "group-2",
					type: "group",
					childIds: [
						"rect-in-group-2",
						"ellipse-in-group-2",
						"nested-group-in-group-2",
						"rect-in-group-2-b",
					],
				} as GroupState,
				"rect-in-group-2": {
					id: "rect-in-group-2",
					type: "rect",
					parentId: "group-2",
				} as RectState,
				"ellipse-in-group-2": {
					id: "ellipse-in-group-2",
					type: "ellipse",
					parentId: "group-2",
				} as EllipseState,
				"nested-group-in-group-2": {
					id: "nested-group-in-group-2",
					type: "group",
					parentId: "group-2",
					childIds: ["rect-in-nested-group-2", "ellipse-in-nested-group-2"],
				} as GroupState,
				"rect-in-nested-group-2": {
					id: "rect-in-nested-group-2",
					type: "rect",
					parentId: "nested-group-in-group-2",
				} as RectState,
				"ellipse-in-nested-group-2": {
					id: "ellipse-in-nested-group-2",
					type: "ellipse",
					parentId: "nested-group-in-group-2",
				} as EllipseState,
				"rect-in-group-2-b": {
					id: "rect-in-group-2-b",
					type: "rect",
					parentId: "group-2",
				} as RectState,
			},
		} as unknown as CanvasState;

		// When range selecting all visible objects in group-2
		// collectIdsInArea returns ALL objects within the area, including nested children
		const result = autoSelectParentGroups(state, [
			"rect-in-group-2",
			"ellipse-in-group-2",
			"nested-group-in-group-2",
			"rect-in-nested-group-2", // This is also selected by range selection!
			"ellipse-in-nested-group-2", // This is also selected by range selection!
			"rect-in-group-2-b",
		]);

		// Expected: only group-2 should be selected
		// Bug: both group-2 and nested-group-in-group-2 are selected
		expect(result).toEqual(["group-2"]);
		expect(result).not.toContain("nested-group-in-group-2");
	});

	it("should handle three-level nested groups", () => {
		const state = {
			objects: {
				"group-1": {
					id: "group-1",
					type: "group",
					childIds: ["group-2", "rect-4"],
				} as GroupState,
				"group-2": {
					id: "group-2",
					type: "group",
					parentId: "group-1",
					childIds: ["group-3", "rect-3"],
				} as GroupState,
				"group-3": {
					id: "group-3",
					type: "group",
					parentId: "group-2",
					childIds: ["rect-1", "rect-2"],
				} as GroupState,
				"rect-1": {
					id: "rect-1",
					type: "rect",
					parentId: "group-3",
				} as RectState,
				"rect-2": {
					id: "rect-2",
					type: "rect",
					parentId: "group-3",
				} as RectState,
				"rect-3": {
					id: "rect-3",
					type: "rect",
					parentId: "group-2",
				} as RectState,
				"rect-4": {
					id: "rect-4",
					type: "rect",
					parentId: "group-1",
				} as RectState,
			},
		} as unknown as CanvasState;

		const result = autoSelectParentGroups(state, [
			"rect-1",
			"rect-2",
			"rect-3",
			"rect-4",
		]);

		// Should select only group-1, not group-2 or group-3
		expect(result).toEqual(["group-1"]);
	});

	it("should handle order independence: multiple groups with children selected simultaneously", () => {
		// This tests if the order of processing parentCandidates affects the result
		// Structure:
		// group-A           group-B
		//   ├─ rect-a1        ├─ rect-b1
		//   └─ rect-a2        └─ rect-b2
		//
		// If we select all rects, both groups should be selected regardless of processing order

		const state = {
			objects: {
				"group-A": {
					id: "group-A",
					type: "group",
					childIds: ["rect-a1", "rect-a2"],
				} as GroupState,
				"group-B": {
					id: "group-B",
					type: "group",
					childIds: ["rect-b1", "rect-b2"],
				} as GroupState,
				"rect-a1": {
					id: "rect-a1",
					type: "rect",
					parentId: "group-A",
				} as RectState,
				"rect-a2": {
					id: "rect-a2",
					type: "rect",
					parentId: "group-A",
				} as RectState,
				"rect-b1": {
					id: "rect-b1",
					type: "rect",
					parentId: "group-B",
				} as RectState,
				"rect-b2": {
					id: "rect-b2",
					type: "rect",
					parentId: "group-B",
				} as RectState,
			},
		} as unknown as CanvasState;

		const result = autoSelectParentGroups(state, [
			"rect-a1",
			"rect-a2",
			"rect-b1",
			"rect-b2",
		]);

		// Both groups should be selected
		expect(result).toHaveLength(2);
		expect(result).toContain("group-A");
		expect(result).toContain("group-B");
		expect(result).not.toContain("rect-a1");
		expect(result).not.toContain("rect-a2");
		expect(result).not.toContain("rect-b1");
		expect(result).not.toContain("rect-b2");
	});

	it("should handle complex scenario: sibling groups at different nesting levels", () => {
		// Structure:
		// root
		//   ├─ group-1
		//   │   ├─ group-1-1
		//   │   │   ├─ rect-1-1-1
		//   │   │   └─ rect-1-1-2
		//   │   └─ rect-1-2
		//   └─ group-2
		//       ├─ rect-2-1
		//       └─ rect-2-2
		//
		// When all leaf rects are selected, we expect ["group-1", "group-2"]
		// Not ["root"] because they are separate groups

		const state = {
			objects: {
				"group-1": {
					id: "group-1",
					type: "group",
					childIds: ["group-1-1", "rect-1-2"],
				} as GroupState,
				"group-1-1": {
					id: "group-1-1",
					type: "group",
					parentId: "group-1",
					childIds: ["rect-1-1-1", "rect-1-1-2"],
				} as GroupState,
				"rect-1-1-1": {
					id: "rect-1-1-1",
					type: "rect",
					parentId: "group-1-1",
				} as RectState,
				"rect-1-1-2": {
					id: "rect-1-1-2",
					type: "rect",
					parentId: "group-1-1",
				} as RectState,
				"rect-1-2": {
					id: "rect-1-2",
					type: "rect",
					parentId: "group-1",
				} as RectState,
				"group-2": {
					id: "group-2",
					type: "group",
					childIds: ["rect-2-1", "rect-2-2"],
				} as GroupState,
				"rect-2-1": {
					id: "rect-2-1",
					type: "rect",
					parentId: "group-2",
				} as RectState,
				"rect-2-2": {
					id: "rect-2-2",
					type: "rect",
					parentId: "group-2",
				} as RectState,
			},
		} as unknown as CanvasState;

		const result = autoSelectParentGroups(state, [
			"rect-1-1-1",
			"rect-1-1-2",
			"rect-1-2",
			"rect-2-1",
			"rect-2-2",
		]);

		// Should select both top-level groups
		expect(result).toHaveLength(2);
		expect(result).toContain("group-1");
		expect(result).toContain("group-2");
		expect(result).not.toContain("group-1-1");
	});
});
