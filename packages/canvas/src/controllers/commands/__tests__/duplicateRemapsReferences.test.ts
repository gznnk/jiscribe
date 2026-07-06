import { beforeAll, describe, expect, it } from "vitest";

import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import { twoRectsWithConnectorDoc } from "./support/fixtures";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { calculateGroupOrientedBounds } from "../../../states/utils/calculateGroupOrientedBounds";
import { initializeCommands } from "../../setup/initializeCommands";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";

beforeAll(() => {
	initializeObjectRegistry();
	initializeCommands();
});

/**
 * Duplicate is a deep clone: every reference the copies carry — connector
 * endpoint owners, group childIds, children's parentId — must point at the
 * fresh IDs, never back at the source objects. A single missed remap silently
 * aliases the copy to the original (moving one moves "both" ends of the other).
 * Spans DuplicateCommand, cloneObjects, and selectConnectorsInSelection through
 * the real handleCommand path.
 */
describe("duplicate deep-clones with all references remapped", () => {
	it("a duplicated connector points at the duplicated shapes, never at the originals", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: ["rect-1", "rect-2"],
		});
		const after = runCommand(state, "duplicate");

		const newIds = after.rootIds.slice(state.rootIds.length);
		expect(newIds).toHaveLength(3);

		const newRectIds = newIds.filter(
			(id) => after.objects[id]?.type === "rect",
		);
		const newConnectorId = newIds.find(
			(id) => after.objects[id]?.type === "connector",
		);
		const newConnector = after.objects[newConnectorId!] as ConnectorState;

		expect(newRectIds).toContain(newConnector.source.owner?.id);
		expect(newRectIds).toContain(newConnector.target.owner?.id);
		expect(newConnector.source.owner?.id).not.toBe("rect-1");
		expect(newConnector.target.owner?.id).not.toBe("rect-2");

		// The original connector still points at the originals.
		const originalConnector = after.objects["conn-1"] as ConnectorState;
		expect(originalConnector.source.owner?.id).toBe("rect-1");
		expect(originalConnector.target.owner?.id).toBe("rect-2");

		// Only the duplicated shapes are selected afterwards.
		expect([...after.selectedIds].sort()).toEqual([...newRectIds].sort());
	});

	it("a duplicated group gets fresh children whose parentId is the fresh group", () => {
		const grouped = runCommand(
			createCommandState(twoRectsWithConnectorDoc, {
				selectedIds: ["rect-1", "rect-2"],
			}),
			"group",
		);
		const originalGroupId = grouped.selectedIds[0];
		const originalGroup = grouped.objects[originalGroupId] as GroupState;

		const after = runCommand(grouped, "duplicate");

		// Appended top level: the duplicated enclosed connector + the duplicated group.
		const newIds = after.rootIds.slice(grouped.rootIds.length);
		expect(newIds).toHaveLength(2);
		const newGroupId = newIds.find((id) => after.objects[id]?.type === "group");
		expect(newGroupId).toBeDefined();
		expect(newGroupId).not.toBe(originalGroupId);

		const newGroup = after.objects[newGroupId!] as GroupState;
		expect(newGroup.childIds).toHaveLength(originalGroup.childIds.length);
		for (const childId of newGroup.childIds) {
			expect(originalGroup.childIds).not.toContain(childId);
			expect(after.objects[childId]?.parentId).toBe(newGroupId);
		}

		// The enclosed connector is duplicated too, remapped onto the cloned children.
		const newConnectorId = newIds.find(
			(id) => after.objects[id]?.type === "connector",
		);
		const newConnector = after.objects[newConnectorId!] as ConnectorState;
		expect(newGroup.childIds).toContain(newConnector.source.owner?.id);
		expect(newGroup.childIds).toContain(newConnector.target.owner?.id);

		// The original group and its children are untouched.
		expect((after.objects[originalGroupId] as GroupState).childIds).toEqual(
			originalGroup.childIds,
		);
		for (const childId of originalGroup.childIds) {
			expect(after.objects[childId]?.parentId).toBe(originalGroupId);
		}
	});

	it("duplicating a group child inserts the copy into the parent group right after the original", () => {
		const grouped = runCommand(
			createCommandState(twoRectsWithConnectorDoc, {
				selectedIds: ["rect-1", "rect-2"],
			}),
			"group",
		);
		const groupId = grouped.selectedIds[0];

		const after = runCommand(
			{ ...grouped, selectedIds: ["rect-1"] },
			"duplicate",
		);

		// The copy lands inside the group (not at the root), right after rect-1.
		const group = after.objects[groupId] as GroupState;
		expect(group.childIds).toHaveLength(3);
		expect(group.childIds[0]).toBe("rect-1");
		expect(group.childIds[2]).toBe("rect-2");
		const newRectId = group.childIds[1];
		expect(after.objects[newRectId]?.parentId).toBe(groupId);
		expect(after.selectedIds).toEqual([newRectId]);

		// conn-1 is not duplicated: its rect-2 endpoint is outside the selection.
		// The root gains no new top-level elements.
		expect(after.rootIds).toEqual(grouped.rootIds);

		// The parent group's cached frame still matches the bounds derived from
		// its (now three) children — the in-group insert recomputed it.
		const derivedBounds = calculateGroupOrientedBounds(after.objects, groupId);
		expect(group.cx).toBeCloseTo(derivedBounds!.cx);
		expect(group.cy).toBeCloseTo(derivedBounds!.cy);
		expect(group.width).toBeCloseTo(derivedBounds!.width);
		expect(group.height).toBeCloseTo(derivedBounds!.height);
	});
});
