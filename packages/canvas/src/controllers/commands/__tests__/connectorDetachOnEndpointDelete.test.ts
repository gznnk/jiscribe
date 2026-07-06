import { beforeAll, describe, expect, it } from "vitest";

import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import {
	halfFreeConnectorDoc,
	threeRectsWithConnectorDoc,
	twoRectsWithConnectorDoc,
} from "./support/fixtures";
import { isFreeEndpointRef } from "../../../schemas/objects/types/EndpointRef";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { initializeCommands } from "../../setup/initializeCommands";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";

beforeAll(() => {
	initializeObjectRegistry();
	initializeCommands();
});

const connectorOf = (
	state: CanvasControllerState,
): ConnectorState | undefined =>
	state.objects["conn-1"] as ConnectorState | undefined;

/**
 * Deleting shapes must never leave a connector referencing a nonexistent owner:
 * either the deleted side detaches to a free anchor at its former visual position,
 * or — when no owned endpoint would remain — the connector is deleted along with
 * the shape. Spans DeleteCommand's descendant collection (groups) and
 * cleanupConnectorsOnDelete, driven through the real handleCommand path.
 */
describe("connectors never dangle after endpoint deletion", () => {
	it("deleting one endpoint shape detaches that side to a free anchor at the former outline point", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: ["rect-2"],
		});
		const after = runCommand(state, "delete");

		expect(after.objects["rect-2"]).toBeUndefined();
		expect(after.rootIds).toEqual(["rect-1", "conn-1"]);

		const connector = connectorOf(after);
		expect(connector).toBeDefined();
		// The surviving side stays owned by rect-1.
		expect(connector?.source.owner?.id).toBe("rect-1");
		// The deleted side becomes free, pinned where the line used to meet
		// rect-2's outline: the 45° line from rect-1's center (5,5) toward
		// rect-2's center (105,105) enters rect-2 (100..110) at its corner.
		expect(isFreeEndpointRef(connector?.target)).toBe(true);
		const freePoint =
			connector?.target.anchor.kind === "free"
				? connector.target.anchor.point
				: null;
		expect(freePoint?.x).toBeCloseTo(100, 1);
		expect(freePoint?.y).toBeCloseTo(100, 1);
	});

	it("deleting both endpoint shapes deletes the connector with them", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: ["rect-1", "rect-2"],
		});
		const after = runCommand(state, "delete");

		expect(after.objects).toEqual({});
		expect(after.rootIds).toEqual([]);
		expect(after.selectedIds).toEqual([]);
	});

	it("deleting the last owner of a half-free connector deletes the connector (no free-free leftovers)", () => {
		const state = createCommandState(halfFreeConnectorDoc, {
			selectedIds: ["rect-1"],
		});
		// Precondition: the half-free connector survives doc loading.
		expect(connectorOf(state)).toBeDefined();

		const after = runCommand(state, "delete");

		expect(after.objects).toEqual({});
		expect(after.rootIds).toEqual([]);
	});

	it("cut detaches the connector like delete, and the clipboard excludes the partially-connected connector", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: ["rect-2"],
		});
		const after = runCommand(state, "cut");

		// Canvas side: same detach as delete.
		expect(after.objects["rect-2"]).toBeUndefined();
		expect(isFreeEndpointRef(connectorOf(after)?.target)).toBe(true);

		// Clipboard side: only the cut shape. The connector's other endpoint is not
		// in the selection, so copying it would break the clipboard's
		// self-containment (isClipboardData would reject it on paste).
		expect(after.internalClipboard?.rootIds).toEqual(["rect-2"]);
		expect(after.internalClipboard?.objects["conn-1"]).toBeUndefined();
	});

	it("deleting a group cascades to its descendants and detaches their connectors", () => {
		const grouped = runCommand(
			createCommandState(threeRectsWithConnectorDoc, {
				selectedIds: ["rect-1", "rect-2"],
			}),
			"group",
		);
		const groupId = grouped.selectedIds[0];
		expect(grouped.objects[groupId]?.type).toBe("group");

		const after = runCommand(grouped, "delete");

		// The group and both children are gone; the outside shape survives.
		expect(after.objects[groupId]).toBeUndefined();
		expect(after.objects["rect-1"]).toBeUndefined();
		expect(after.objects["rect-2"]).toBeUndefined();
		expect(after.objects["rect-3"]).toBeDefined();
		expect(after.rootIds).toEqual(["rect-3", "conn-1"]);

		// The connector's rect-1 side (deleted as a group descendant) is now free,
		// pinned on rect-1's former outline toward rect-3: the horizontal line from
		// (5,5) to (205,5) leaves rect-1 (0..10) at its right edge.
		const connector = connectorOf(after);
		expect(isFreeEndpointRef(connector?.source)).toBe(true);
		const freePoint =
			connector?.source.anchor.kind === "free"
				? connector.source.anchor.point
				: null;
		expect(freePoint?.x).toBeCloseTo(10, 1);
		expect(freePoint?.y).toBeCloseTo(5, 1);
		// The rect-3 side stays owned.
		expect(connector?.target.owner?.id).toBe("rect-3");
	});
});
