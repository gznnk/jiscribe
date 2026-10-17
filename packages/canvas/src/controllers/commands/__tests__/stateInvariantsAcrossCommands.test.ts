import { describe, expect, it } from "vitest";

import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import {
	threeRectsWithConnectorDoc,
	twoRectsWithConnectorDoc,
} from "./support/fixtures";
import { isTextStyleState } from "../../../states/objects/base/TextStyleState";
import { isConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { TEXT_SLOT_PART_KIND } from "../../selection/partKinds/textSlotPartKind";
import { reconcileSelection } from "../../selection/writers/reconcileSelection";

const registries = createTestRegistries();

/**
 * Structural invariants that must hold after ANY command, regardless of what it
 * does. Returns human-readable violations instead of asserting, so a failure
 * names the command and the broken invariant.
 */
const collectInvariantViolations = (state: CanvasControllerState): string[] => {
	const violations: string[] = [];

	// A connector is selected on its own: one of them, never beside a shape.
	for (const id of state.selection.objectIds) {
		if (
			isConnectorState(state.objects[id]) &&
			state.selection.objectIds.length > 1
		) {
			violations.push(`connector ${id} is selected alongside other objects`);
		}
		if (!state.objects[id]) {
			violations.push(`selection.objectIds names nonexistent object ${id}`);
		}
	}

	// A slot selection the reducer's reconciliation keeps must name a live slot of
	// the sole selected object. A command alone may leave a stale one behind — the
	// reducer clears it after the command runs (reconcileSelection) — so
	// the invariant is pinned on the reconciled state, not the raw one. What this
	// catches is a command turning a stale selection into a live one.
	const { objectIds, part } = reconcileSelection(
		state,
		registries.objectPartKind,
	).selection;
	if (part !== null) {
		const slotId = part.ranges[0].anchorId;
		if (objectIds.length !== 1) {
			violations.push(
				`selection.part survives a selection of ${objectIds.length} objects`,
			);
		}
		const objectId = objectIds[0];
		const owner = state.objects[objectId];
		if (!isTextStyleState(owner) || owner.text?.[slotId] === undefined) {
			violations.push(
				`selection.part resolves to slot ${slotId} which ${objectId} does not have`,
			);
		}
	}

	// rootIds: no duplicates, no dangling references, only top-level elements.
	const seenRootIds = new Set<string>();
	for (const id of state.rootIds) {
		if (seenRootIds.has(id)) {
			violations.push(`rootIds contains ${id} twice`);
		}
		seenRootIds.add(id);
		const obj = state.objects[id];
		if (!obj) {
			violations.push(`rootIds references nonexistent object ${id}`);
		} else if (obj.parentId != null) {
			violations.push(
				`rootIds contains ${id} which has parentId ${obj.parentId}`,
			);
		}
	}

	for (const [id, obj] of Object.entries(state.objects)) {
		// Non-root objects must be reachable: their parent exists, is a group, and links back.
		if (obj.parentId != null) {
			const parent = state.objects[obj.parentId];
			if (parent?.type !== "group") {
				violations.push(
					`${id} has parentId ${obj.parentId} which is not an existing group`,
				);
			} else if (!(parent as GroupState).childIds.includes(id)) {
				violations.push(
					`${id} is not in its parent ${obj.parentId}'s childIds`,
				);
			}
		} else if (!seenRootIds.has(id)) {
			violations.push(
				`${id} has no parent but is missing from rootIds (orphan)`,
			);
		}

		if (obj.type === "group") {
			const group = obj as GroupState;
			// cleanupGroups guarantees no empty/singleton wrappers survive a command.
			if (group.childIds.length < 2) {
				violations.push(`group ${id} has ${group.childIds.length} children`);
			}
			for (const childId of group.childIds) {
				if (!state.objects[childId]) {
					violations.push(
						`group ${id} childIds references nonexistent ${childId}`,
					);
				} else if (state.objects[childId].parentId !== id) {
					violations.push(
						`group ${id} child ${childId} does not point back via parentId`,
					);
				}
			}
		}

		if (isConnectorState(obj)) {
			const connector = obj as ConnectorState;
			for (const side of ["source", "target"] as const) {
				const ownerId = connector[side].owner?.id;
				if (ownerId != null && !state.objects[ownerId]) {
					violations.push(
						`connector ${id} ${side} owner ${ownerId} does not exist`,
					);
				}
			}
		}
	}

	return violations;
};

/**
 * Every registered command is executed from each representative starting state
 * through the real handleCommand path (canExecute gate included), and the
 * resulting state is checked against the full invariant set. This is the
 * cross-cutting net that catches a command forgetting to clear a mutually
 * exclusive selection channel, leaving dangling IDs, or breaking group
 * back-references — including commands added in the future.
 */
describe("every command preserves structural invariants", () => {
	const scenarios: Array<{
		label: string;
		build: () => CanvasControllerState;
	}> = [
		{
			label: "nothing selected",
			build: () => createCommandState(twoRectsWithConnectorDoc),
		},
		{
			label: "one shape selected",
			build: () =>
				createCommandState(twoRectsWithConnectorDoc, {
					selection: selectionOf(["rect-1"]),
				}),
		},
		{
			label: "all shapes selected",
			build: () =>
				createCommandState(twoRectsWithConnectorDoc, {
					selection: selectionOf(["rect-1", "rect-2"]),
				}),
		},
		{
			// No built-in type spells its text out as slots, so this exercises the
			// stale side: no command may turn a raw part selection into a live one.
			label: "one shape selected with a stale text slot",
			build: () =>
				createCommandState(twoRectsWithConnectorDoc, {
					selection: selectionOf(["rect-1"], {
						kind: TEXT_SLOT_PART_KIND,
						ranges: [{ anchorId: "no-such-slot", focusId: "no-such-slot" }],
					}),
				}),
		},
		{
			label: "a connector selected",
			build: () =>
				createCommandState(twoRectsWithConnectorDoc, {
					selection: selectionOf(["conn-1"]),
				}),
		},
		{
			label: "a nested group selected",
			build: () => {
				const inner = runCommand(
					createCommandState(threeRectsWithConnectorDoc, {
						selection: selectionOf(["rect-1", "rect-2"]),
					}),
					"group",
				);
				return runCommand(
					{
						...inner,
						selection: selectionOf([inner.selection.objectIds[0], "rect-3"]),
					},
					"group",
				);
			},
		},
	];

	for (const scenario of scenarios) {
		it(`starting from "${scenario.label}", the invariants hold after every command`, () => {
			const commands = registries.command.getAll();
			expect(commands.length).toBeGreaterThan(0);

			// Sanity: the starting state itself must be sound, or the sweep proves nothing.
			expect(collectInvariantViolations(scenario.build())).toEqual([]);

			for (const command of commands) {
				const after = runCommand(scenario.build(), command.id);
				expect(
					collectInvariantViolations(after),
					`command "${command.id}" broke invariants`,
				).toEqual([]);
			}
		});
	}
});
