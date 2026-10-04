import { describe, expect, it } from "vitest";

import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import { twoRectsWithConnectorDoc } from "./support/fixtures";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";

/**
 * A connector is only ever selected on its own, and is mixed into rootIds for
 * z-ordering alone. It must never be pulled into a multi-selection / a group,
 * because a connector follows its endpoints rather than a group transform, and
 * the group OBB calculation would misread it as a Poly (waypoints only).
 *
 * Guards both leak points: Select All (fills the selection from rootIds) and Group itself.
 */
describe("connectors are never groupable", () => {
	it("Select All excludes the connector from the selection", () => {
		const state = createCommandState(twoRectsWithConnectorDoc);
		const afterSelectAll = runCommand(state, "selectAll");

		expect(afterSelectAll.selection.objectIds).toEqual(["rect-1", "rect-2"]);
		expect(afterSelectAll.selection.objectIds).not.toContain("conn-1");
	});

	it("Select All → Group leaves the connector ungrouped and still in rootIds", () => {
		const state = createCommandState(twoRectsWithConnectorDoc);
		const afterGroup = runCommand(runCommand(state, "selectAll"), "group");

		const groupId = afterGroup.selection.objectIds[0];
		const group = afterGroup.objects[groupId] as GroupState;

		// The group is made of the two shapes only — no connector.
		expect(group.childIds).toEqual(["rect-1", "rect-2"]);
		// The connector keeps its top-level parent and its place in rootIds.
		expect(afterGroup.objects["conn-1"]?.parentId).toBeUndefined();
		expect(afterGroup.rootIds).toContain("conn-1");
	});

	it("Group is disabled when the shape count (excluding connectors) is < 2", () => {
		// One shape + one connector: not groupable.
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selection: selectionOf(["rect-1", "conn-1"]),
		});
		const afterGroup = runCommand(state, "group");

		// canExecute gate blocks execution: selection is untouched and no group is created.
		expect(afterGroup.selection.objectIds).toEqual(["rect-1", "conn-1"]);
		const hasGroup = Object.values(afterGroup.objects).some(
			(obj) => obj?.type === "group",
		);
		expect(hasGroup).toBe(false);
	});

	it("Group drops a connector that leaked into the selection", () => {
		// Simulate a selection that already contains a connector alongside 2 shapes.
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selection: selectionOf(["rect-1", "rect-2", "conn-1"]),
		});
		const afterGroup = runCommand(state, "group");

		const groupId = afterGroup.selection.objectIds[0];
		const group = afterGroup.objects[groupId] as GroupState;

		expect(group.childIds).toEqual(["rect-1", "rect-2"]);
		expect(afterGroup.objects["conn-1"]?.parentId).toBeUndefined();
		expect(afterGroup.rootIds).toContain("conn-1");
	});
});
