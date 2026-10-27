import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { advanceTextMeasurementGeneration } from "@jiscribe/doc/text/measure/textMeasurementSlot";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import {
	applyActions,
	runCommands,
	testReducerRegistries,
} from "./support/dispatch";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { UndoCommand } from "../../commands/history/UndoCommand";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import {
	createDocSnapshotFromState,
	resolveDocSnapshot,
} from "../../utils/resolveDocSnapshot";

/**
 * Undo, redo and revert restore the state an entry holds as is, so whatever
 * the swap leaves alone keeps its identity — what lets every per-object cache
 * downstream hit. An entry recorded under an older text measurement generation
 * is covered on its own (canvasReducer.historyFonts.test.ts).
 */

const threeRectsDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		rectDoc("rect-2", 100, 100),
		rectDoc("rect-3", 200, 0),
	],
} as unknown as CanvasDoc;

/** A document whose own form a save of its rebuild would not keep (more decimals than a save writes, a default spelled out). */
const unnormalizedDoc = (): CanvasDoc =>
	({
		version: 1,
		root: [
			{
				id: "rect-1",
				type: "rect",
				x: 0.123456,
				y: 10,
				width: 10,
				height: 10,
				rotation: 0,
			},
			rectDoc("rect-2", 100, 10),
		],
	}) as unknown as CanvasDoc;

const textDoc = {
	version: 1,
	root: [{ id: "text-1", type: "text", x: 100, y: 60, text: "Hello world" }],
} as unknown as CanvasDoc;

/**
 * The text state with a box no measurement gives, in the one past entry: what
 * a box measured against a fallback face looks like once the real one loads.
 */
const withStaleTextEntry = (): {
	state: CanvasControllerState;
	staleText: ObjectState;
} => {
	const base = createTestState(textDoc);
	const staleText = { ...base.objects["text-1"], width: 1, height: 1 };
	const staleEntry = createDocSnapshotFromState({
		...base,
		objects: { "text-1": staleText },
	});
	return {
		state: createTestState(textDoc, {
			history: {
				past: [staleEntry],
				present: base.history.present,
				future: [],
			},
		}),
		staleText,
	};
};

describe("canvasReducer (integration)", () => {
	describe("history restore", () => {
		it("hands back the very objects an undo and a redo leave alone", () => {
			const start = createTestState(twoRectsDoc, {
				selection: selectionOf(["rect-1"]),
			});
			const moved = runCommands(start, "move-right");

			const undone = runCommands(moved, "undo");
			expect(undone.objects["rect-1"]).toBe(start.objects["rect-1"]);
			expect(undone.objects["rect-2"]).toBe(start.objects["rect-2"]);

			const redone = runCommands(undone, "redo");
			expect(redone.objects["rect-1"]).toBe(moved.objects["rect-1"]);
			expect(redone.objects["rect-2"]).toBe(start.objects["rect-2"]);
		});

		it("brings a deleted object back as the reference it was", () => {
			const start = createTestState(threeRectsDoc, {
				selection: selectionOf(["rect-2"]),
			});
			const deleted = runCommands(start, "delete");
			expect(deleted.objects["rect-2"]).toBeUndefined();

			const undone = runCommands(deleted, "undo");
			for (const id of ["rect-1", "rect-2", "rect-3"]) {
				expect(undone.objects[id]).toBe(start.objects[id]);
			}
			expect(undone.rootIds).toBe(start.rootIds);
		});

		it("hands back the very objects a revert leaves alone", () => {
			const start = createTestState(twoRectsDoc, {
				selection: selectionOf(["rect-1"]),
			});
			const moved = runCommands(start, "move-right", "move-down");

			const reverted = applyActions(moved, [
				{ type: "REVERT_HISTORY", entry: start.history.present.source },
			]);
			expect(reverted.objects["rect-1"]).toBe(start.objects["rect-1"]);
			expect(reverted.objects["rect-2"]).toBe(start.objects["rect-2"]);
		});

		for (const fontsArrived of [false, true]) {
			it(`saves the opened document verbatim after undoing back to it${fontsArrived ? ", across a font load" : ""}`, () => {
				const start = createTestState(unnormalizedDoc(), {
					selection: selectionOf(["rect-2"]),
				});
				const moved = runCommands(start, "move-right");
				if (fontsArrived) {
					advanceTextMeasurementGeneration();
				}

				const undone = runCommands(moved, "undo");
				const saved = resolveDocSnapshot(
					undone.history.present,
					testReducerRegistries.objectMapper,
				);

				expect(saved).toBe(start.history.present.openedDoc);
				expect(saved).toEqual(unnormalizedDoc());
			});
		}

		it("restores an entry of the current generation as it is, box included", () => {
			const { state, staleText } = withStaleTextEntry();

			// The command alone: the reducer's settling after it re-measures a box
			// that changed under the same text anyway, which would hide the path.
			const undone = UndoCommand.execute(state, testReducerRegistries);

			expect(undone.objects["text-1"]).toBe(staleText);
		});
	});

	/** The chrome is not part of the document an entry holds. */
	it("leaves the chrome's form and both sidebars as they are across undo and redo", () => {
		const start = createTestState(twoRectsDoc, {
			selection: selectionOf(["rect-1"]),
		});
		const moved = runCommands(start, "move-right", "toggleSidebars");
		expect(moved.isChromeExpanded).toBe(true);

		const undone = runCommands(moved, "undo");
		expect(undone.isChromeExpanded).toBe(true);
		expect(undone.stencilLibraryPanel).toBe(moved.stencilLibraryPanel);
		expect(undone.propertyPanel).toBe(moved.propertyPanel);

		const collapsed = runCommands(undone, "toggleSidebars", "redo");
		expect(collapsed.isChromeExpanded).toBe(false);
	});
});
