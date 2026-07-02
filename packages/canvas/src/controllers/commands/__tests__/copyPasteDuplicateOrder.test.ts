import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { handlePaste } from "../../reducer/handlers/handlePaste";
import { initializeCommands } from "../../setup/initializeCommands";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { CopyCommand } from "../selection/CopyCommand";
import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import { twoRectsWithConnectorDoc } from "./support/fixtures";

beforeAll(() => {
	initializeObjectRegistry();
	initializeCommands();
});

/** A selection whose z-order has the connector "between" rect-1 and rect-2. */
const betweenState = (): CanvasControllerState =>
	createCommandState(twoRectsWithConnectorDoc, {
		selectedIds: ["rect-1", "rect-2"],
		rootIds: ["rect-1", "conn-1", "rect-2"],
	});

/** The type sequence at the tail of rootIds (the items added by duplicate/paste). */
const appendedTypes = (
	after: CanvasControllerState,
	originalLen: number,
): string[] =>
	after.rootIds.slice(originalLen).map((id) => after.objects[id]?.type ?? "");

/**
 * Copy/duplicate adds items to the front while preserving the copy set's relative stack order.
 * Verifies that a "connector sitting between two shapes" stays between them after duplication
 * (regression guard against the bug where a naive concat pushes the connector to the front).
 */
describe("preserves connectors' relative z order on copy/duplicate", () => {
	it("duplicate: connector is kept between the two shapes", () => {
		const after = runCommand(betweenState(), "duplicate");
		expect(after.rootIds).toHaveLength(6);
		expect(appendedTypes(after, 3)).toEqual(["rect", "connector", "rect"]);
	});

	it("copy → paste: connector is kept between the two shapes", () => {
		const state = betweenState();
		const clipboard = CopyCommand.execute(state).internalClipboard;
		expect(clipboard).not.toBeNull();
		// clipboard is already z-ordered (with the connector interleaved)
		expect(clipboard?.rootIds).toEqual(["rect-1", "conn-1", "rect-2"]);

		const after = handlePaste(state, clipboard!);
		expect(after.rootIds).toHaveLength(6);
		expect(appendedTypes(after, 3)).toEqual(["rect", "connector", "rect"]);
	});
});

/**
 * A paste that makes selectedIds non-empty must clear the mutually-exclusive
 * connector/vertex selection (regression guard for #71). Otherwise SwapArrows / Delete
 * and the like would act on an old connector/vertex that is no longer on screen.
 */
describe("maintains selection mutual exclusivity on paste", () => {
	it("pasting while a connector is selected sets selectedConnectorId to null", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: [],
			selectedConnectorId: "conn-1",
			rootIds: ["rect-1", "conn-1", "rect-2"],
		});
		const clipboard = CopyCommand.execute(
			createCommandState(twoRectsWithConnectorDoc, {
				selectedIds: ["rect-1"],
				rootIds: ["rect-1", "conn-1", "rect-2"],
			}),
		).internalClipboard;
		expect(clipboard).not.toBeNull();

		const after = handlePaste(state, clipboard!);
		expect(after.selectedConnectorId).toBeNull();
		expect(after.selectedIds.length).toBeGreaterThan(0);
	});

	it("pasting while a vertex is selected sets selectedVertex to null", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: [],
			selectedVertex: { objectId: "rect-1", vertexIndex: 0 },
			rootIds: ["rect-1", "conn-1", "rect-2"],
		});
		const clipboard = CopyCommand.execute(
			createCommandState(twoRectsWithConnectorDoc, {
				selectedIds: ["rect-1"],
				rootIds: ["rect-1", "conn-1", "rect-2"],
			}),
		).internalClipboard;
		expect(clipboard).not.toBeNull();

		const after = handlePaste(state, clipboard!);
		expect(after.selectedVertex).toBeNull();
	});
});
