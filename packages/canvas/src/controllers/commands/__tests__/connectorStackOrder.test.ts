import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import { twoRectsWithConnectorDoc } from "./support/fixtures";
import { initializeCommands } from "../../setup/initializeCommands";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { isArrangeableSelection } from "../../utils/isArrangeableSelection";

beforeAll(() => {
	// canvasToState (doc→state) needs object/connector Mappers, and handleCommand needs Commands
	initializeObjectRegistry();
	initializeCommands();
});

/**
 * Connectors are selected via selectedConnectorId, which is mutually exclusive with selectedIds.
 * The order of rootIds specifies the connector's initial z position.
 */
const withConnectorSelected = (rootIds: string[]): CanvasControllerState =>
	createCommandState(twoRectsWithConnectorDoc, {
		selectedConnectorId: "conn-1",
		rootIds,
	});

/**
 * Integration test verifying that stack-order commands work even when a connector
 * is selected, going through the same entry point as an ObjectMenu StackOrder click
 * (ObjectMenuHandler → handleCommand).
 */
describe("stack order when a connector is selected (via StackOrder / handleCommand)", () => {
	it("satisfies the condition (isArrangeableSelection) for showing the StackOrder menu", () => {
		expect(
			isArrangeableSelection(
				withConnectorSelected(["rect-1", "rect-2", "conn-1"]),
			),
		).toBe(true);
	});

	it("sendToBack: moves the connector to the back", () => {
		expect(
			runCommand(
				withConnectorSelected(["rect-1", "rect-2", "conn-1"]),
				"sendToBack",
			).rootIds,
		).toEqual(["conn-1", "rect-1", "rect-2"]);
	});

	it("bringToFront: moves the connector to the front", () => {
		expect(
			runCommand(
				withConnectorSelected(["conn-1", "rect-1", "rect-2"]),
				"bringToFront",
			).rootIds,
		).toEqual(["rect-1", "rect-2", "conn-1"]);
	});

	it("sendBackward: moves the connector back by one", () => {
		expect(
			runCommand(
				withConnectorSelected(["rect-1", "conn-1", "rect-2"]),
				"sendBackward",
			).rootIds,
		).toEqual(["conn-1", "rect-1", "rect-2"]);
	});

	it("bringForward: moves the connector forward by one", () => {
		expect(
			runCommand(
				withConnectorSelected(["rect-1", "conn-1", "rect-2"]),
				"bringForward",
			).rootIds,
		).toEqual(["rect-1", "rect-2", "conn-1"]);
	});
});
