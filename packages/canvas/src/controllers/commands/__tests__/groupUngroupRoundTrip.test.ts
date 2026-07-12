import { describe, expect, it } from "vitest";

import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import {
	threeRectsWithConnectorDoc,
	twoRectsWithConnectorDoc,
} from "./support/fixtures";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";

/**
 * Group and ungroup are structural inverses: ungroup must restore the children's
 * parentId / root membership / relative z-order, and grouping must compose
 * correctly through the LCA (lowest common ancestor) when nesting. Spans
 * GroupCommand, UngroupCommand, and cleanupGroups through the real
 * handleCommand path.
 */
describe("group → ungroup restores the flat structure", () => {
	it("children return to the root with no parentId, replacing the group at its z position", () => {
		const grouped = runCommand(
			createCommandState(twoRectsWithConnectorDoc, {
				selectedIds: ["rect-1", "rect-2"],
			}),
			"group",
		);
		const groupId = grouped.selectedIds[0];
		// Grouping pulled the rects out of the root and appended the group at the front.
		expect(grouped.rootIds).toEqual(["conn-1", groupId]);

		const ungrouped = runCommand(grouped, "ungroup");

		// The group object is gone and the children stand at its former z position.
		expect(ungrouped.objects[groupId]).toBeUndefined();
		expect(ungrouped.rootIds).toEqual(["conn-1", "rect-1", "rect-2"]);
		expect(ungrouped.objects["rect-1"]?.parentId).toBeUndefined();
		expect(ungrouped.objects["rect-2"]?.parentId).toBeUndefined();
		// The promoted children become the selection.
		expect(ungrouped.selectedIds).toEqual(["rect-1", "rect-2"]);
	});

	it("grouping preserves the children's z-order regardless of selection order", () => {
		const grouped = runCommand(
			createCommandState(twoRectsWithConnectorDoc, {
				// Selection order is front-to-back (e.g. shift-clicking front first) …
				selectedIds: ["rect-2", "rect-1"],
			}),
			"group",
		);
		const group = grouped.objects[grouped.selectedIds[0]] as GroupState;

		// … but childIds follow the canvas z-order, not the click order.
		expect(group.childIds).toEqual(["rect-1", "rect-2"]);
	});
});

describe("nested grouping composes and decomposes through the LCA", () => {
	/** threeRects: group rect-1 + rect-2 into g1, then g1 + rect-3 into g2. */
	const buildNested = () => {
		const inner = runCommand(
			createCommandState(threeRectsWithConnectorDoc, {
				selectedIds: ["rect-1", "rect-2"],
			}),
			"group",
		);
		const innerGroupId = inner.selectedIds[0];
		const outer = runCommand(
			{ ...inner, selectedIds: [innerGroupId, "rect-3"] },
			"group",
		);
		return { outer, innerGroupId, outerGroupId: outer.selectedIds[0] };
	};

	it("grouping a group with a shape nests them under a new root group", () => {
		const { outer, innerGroupId, outerGroupId } = buildNested();

		const outerGroup = outer.objects[outerGroupId] as GroupState;
		// z-order in the root was [rect-3, conn-1, g1], so rect-3 sits behind g1.
		expect(outerGroup.childIds).toEqual(["rect-3", innerGroupId]);
		expect(outer.objects[innerGroupId]?.parentId).toBe(outerGroupId);
		expect(outer.objects["rect-3"]?.parentId).toBe(outerGroupId);
		// The inner group keeps its own children.
		expect((outer.objects[innerGroupId] as GroupState).childIds).toEqual([
			"rect-1",
			"rect-2",
		]);
		// Root now holds only the connector and the outer group.
		expect(outer.rootIds).toEqual(["conn-1", outerGroupId]);
	});

	it("ungrouping the outer group promotes its children one level, leaving the inner group intact", () => {
		const { outer, innerGroupId, outerGroupId } = buildNested();

		const ungrouped = runCommand(outer, "ungroup");

		expect(ungrouped.objects[outerGroupId]).toBeUndefined();
		expect(ungrouped.rootIds).toEqual(["conn-1", "rect-3", innerGroupId]);
		expect(ungrouped.objects["rect-3"]?.parentId).toBeUndefined();
		// One level only: the inner group survives with its children still attached.
		const innerGroup = ungrouped.objects[innerGroupId] as GroupState;
		expect(innerGroup.parentId).toBeUndefined();
		expect(innerGroup.childIds).toEqual(["rect-1", "rect-2"]);
		expect(ungrouped.objects["rect-1"]?.parentId).toBe(innerGroupId);
	});

	it("re-grouping all children of a group dissolves the now-singleton outer group", () => {
		const inner = runCommand(
			createCommandState(threeRectsWithConnectorDoc, {
				selectedIds: ["rect-1", "rect-2"],
			}),
			"group",
		);
		const firstGroupId = inner.selectedIds[0];

		// Select the two children inside g1 and group them again: the LCA is g1,
		// which is left holding a single child (the new group) and must be dissolved
		// by cleanupGroups rather than survive as a pointless one-child wrapper.
		const regrouped = runCommand(
			{ ...inner, selectedIds: ["rect-1", "rect-2"] },
			"group",
		);
		const newGroupId = regrouped.selectedIds[0];
		expect(newGroupId).not.toBe(firstGroupId);

		expect(regrouped.objects[firstGroupId]).toBeUndefined();
		const newGroup = regrouped.objects[newGroupId] as GroupState;
		expect(newGroup.childIds).toEqual(["rect-1", "rect-2"]);
		expect(newGroup.parentId).toBeUndefined();
		expect(regrouped.rootIds).toContain(newGroupId);
	});
});
