import { describe, expect, it } from "vitest";

import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import {
	threeRectsWithConnectorDoc,
	twoRectsWithConnectorDoc,
} from "./support/fixtures";
import { isConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";

const registries = createTestRegistries();

/**
 * Structural invariants that must hold after ANY command, regardless of what it
 * does. Returns human-readable violations instead of asserting, so a failure
 * names the command and the broken invariant.
 */
const collectInvariantViolations = (state: CanvasControllerState): string[] => {
	const violations: string[] = [];

	// Selection channels are mutually exclusive, and connectors never enter selectedIds.
	if (state.selectedIds.length > 0 && state.selectedConnectorId !== null) {
		violations.push(
			"selectedIds and selectedConnectorId are both set (channels must be mutually exclusive)",
		);
	}
	for (const id of state.selectedIds) {
		if (isConnectorState(state.objects[id])) {
			violations.push(`connector ${id} leaked into selectedIds`);
		}
		if (!state.objects[id]) {
			violations.push(`selectedIds references nonexistent object ${id}`);
		}
	}
	if (
		state.selectedConnectorId !== null &&
		!state.objects[state.selectedConnectorId]
	) {
		violations.push(
			`selectedConnectorId references nonexistent object ${state.selectedConnectorId}`,
		);
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
					selectedIds: ["rect-1"],
				}),
		},
		{
			label: "all shapes selected",
			build: () =>
				createCommandState(twoRectsWithConnectorDoc, {
					selectedIds: ["rect-1", "rect-2"],
				}),
		},
		{
			label: "a connector selected",
			build: () =>
				createCommandState(twoRectsWithConnectorDoc, {
					selectedConnectorId: "conn-1",
				}),
		},
		{
			label: "a nested group selected",
			build: () => {
				const inner = runCommand(
					createCommandState(threeRectsWithConnectorDoc, {
						selectedIds: ["rect-1", "rect-2"],
					}),
					"group",
				);
				return runCommand(
					{ ...inner, selectedIds: [inner.selectedIds[0], "rect-3"] },
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
