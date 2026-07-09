import { describe, expect, it } from "vitest";

import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import { twoRectsWithConnectorDoc } from "./support/fixtures";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { handlePaste } from "../../reducer/handlers/handlePaste";
import { createTestRegistries } from "../../setup/createCanvasRegistries";
import { isClipboardData as isClipboardDataRaw } from "../selection/ClipboardData";

const registries = createTestRegistries();

// isClipboardData now takes the per-type validator registry explicitly; bind
// the fully-populated per-type validator registry from the test bundle.
const isClipboardData = (value: unknown): boolean =>
	isClipboardDataRaw(value, registries.objectStateValidator);

/**
 * Copy and paste live on opposite sides of an untrusted boundary (the system
 * clipboard): CopyCommand serializes, and isClipboardData re-validates the data
 * as if it came from a foreign app. This contract only holds if everything
 * CopyCommand produces passes its own paste-side validator (self-containment of
 * childIds / endpoint owners, key↔id consistency, per-object schema), and if
 * handlePaste then rebuilds an isomorphic structure with all references remapped
 * to fresh IDs.
 */
describe("copy output always passes the paste-side clipboard validator", () => {
	it("shapes + a fully-enclosed connector serialize to valid, self-contained clipboard data", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: ["rect-1", "rect-2"],
		});
		const clipboard = runCommand(state, "copy").internalClipboard;

		expect(clipboard?.objects["conn-1"]).toBeDefined();
		expect(isClipboardData(clipboard)).toBe(true);
	});

	it("copying a single endpoint shape excludes the connector, keeping the payload self-contained", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: ["rect-1"],
		});
		const clipboard = runCommand(state, "copy").internalClipboard;

		// Including conn-1 would reference the absent rect-2 and fail validation.
		expect(clipboard?.objects["conn-1"]).toBeUndefined();
		expect(clipboard?.rootIds).toEqual(["rect-1"]);
		expect(isClipboardData(clipboard)).toBe(true);
	});

	it("copying a group includes its descendants and the connector they enclose, and passes validation", () => {
		const grouped = runCommand(
			createCommandState(twoRectsWithConnectorDoc, {
				selectedIds: ["rect-1", "rect-2"],
			}),
			"group",
		);
		const groupId = grouped.selectedIds[0];
		const clipboard = runCommand(grouped, "copy").internalClipboard;

		// The payload carries the group's children (childIds must resolve within
		// the payload for self-containment) and also conn-1: it stays at the root
		// after grouping, but both of its endpoints are group descendants, so the
		// "fully enclosed" test pulls it into the copy (z-order preserved).
		expect(clipboard?.rootIds).toEqual(["conn-1", groupId]);
		expect(clipboard?.objects["rect-1"]).toBeDefined();
		expect(clipboard?.objects["rect-2"]).toBeDefined();
		expect(isClipboardData(clipboard)).toBe(true);
	});
});

describe("paste rebuilds the copied structure with all references remapped", () => {
	const pastedTopLevelIds = (
		before: CanvasControllerState,
		after: CanvasControllerState,
	): string[] => after.rootIds.slice(before.rootIds.length);

	it("a pasted connector points at the pasted shapes, never at the originals", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: ["rect-1", "rect-2"],
		});
		const copied = runCommand(state, "copy");
		const after = handlePaste(copied, copied.internalClipboard!);

		const newIds = pastedTopLevelIds(state, after);
		expect(newIds).toHaveLength(3);

		const newConnectorId = newIds.find(
			(id) => after.objects[id]?.type === "connector",
		);
		const newRectIds = newIds.filter(
			(id) => after.objects[id]?.type === "rect",
		);
		const connector = after.objects[newConnectorId!] as ConnectorState;

		// Endpoints resolve within the pasted set: cloneObjects remapped them.
		expect(newRectIds).toContain(connector.source.owner?.id);
		expect(newRectIds).toContain(connector.target.owner?.id);
		// And never at the source objects (a paste must not "steal" existing shapes).
		expect(connector.source.owner?.id).not.toBe("rect-1");
		expect(connector.target.owner?.id).not.toBe("rect-2");
	});

	it("a pasted group is a deep clone: fresh child IDs whose parentId is the fresh group ID", () => {
		const grouped = runCommand(
			createCommandState(twoRectsWithConnectorDoc, {
				selectedIds: ["rect-1", "rect-2"],
			}),
			"group",
		);
		const originalGroupId = grouped.selectedIds[0];
		const originalGroup = grouped.objects[originalGroupId] as GroupState;

		const copied = runCommand(grouped, "copy");
		const after = handlePaste(copied, copied.internalClipboard!);

		// Pasted top level: the enclosed connector + the group.
		const newIds = pastedTopLevelIds(grouped, after);
		expect(newIds).toHaveLength(2);
		const newGroupId = newIds.find((id) => after.objects[id]?.type === "group");
		const newConnectorId = newIds.find(
			(id) => after.objects[id]?.type === "connector",
		);
		expect(newGroupId).toBeDefined();
		expect(newGroupId).not.toBe(originalGroupId);

		const newGroup = after.objects[newGroupId!] as GroupState;
		expect(newGroup.childIds).toHaveLength(originalGroup.childIds.length);
		for (const childId of newGroup.childIds) {
			// Children are clones, not the originals still parented elsewhere.
			expect(originalGroup.childIds).not.toContain(childId);
			expect(after.objects[childId]?.parentId).toBe(newGroupId);
		}

		// The pasted connector's endpoints resolve to the cloned children — the
		// remap reaches into group descendants, not just top-level elements.
		const newConnector = after.objects[newConnectorId!] as ConnectorState;
		expect(newGroup.childIds).toContain(newConnector.source.owner?.id);
		expect(newGroup.childIds).toContain(newConnector.target.owner?.id);

		// The original group is untouched.
		expect((after.objects[originalGroupId] as GroupState).childIds).toEqual(
			originalGroup.childIds,
		);
	});

	it("paste selects only the pasted shapes (connectors stay in their own channel)", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: ["rect-1", "rect-2"],
		});
		const copied = runCommand(state, "copy");
		const after = handlePaste(copied, copied.internalClipboard!);

		const newIds = pastedTopLevelIds(state, after);
		const newRectIds = newIds.filter(
			(id) => after.objects[id]?.type === "rect",
		);
		expect([...after.selectedIds].sort()).toEqual([...newRectIds].sort());
		expect(after.selectedConnectorId).toBeNull();
	});
});
