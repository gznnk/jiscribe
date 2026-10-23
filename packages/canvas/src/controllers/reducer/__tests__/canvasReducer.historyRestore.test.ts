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
import { createDocSnapshotFromState } from "../../utils/resolveDocSnapshot";

/**
 * Undo, redo and revert restore the state an entry holds as is, so whatever
 * the swap leaves alone keeps its identity — what lets every per-object cache
 * downstream hit. The one exception is an entry measured under an older text
 * measurement generation, which is rebuilt so its boxes follow the fonts now
 * loaded.
 */

const threeRectsDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		rectDoc("rect-2", 100, 100),
		rectDoc("rect-3", 200, 0),
	],
} as unknown as CanvasDoc;

const textDoc = {
	version: 1,
	root: [{ id: "text-1", type: "text", x: 100, y: 60, text: "Hello world" }],
} as unknown as CanvasDoc;

const sizeOf = (object: ObjectState) =>
	object as unknown as { width: number; height: number };

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

		it("restores an entry of the current generation as it is, box included", () => {
			const { state, staleText } = withStaleTextEntry();

			// The command alone: the reducer's settling after it re-measures a box
			// that changed under the same text anyway, which would hide the path.
			const undone = UndoCommand.execute(state, testReducerRegistries);

			expect(undone.objects["text-1"]).toBe(staleText);
		});

		it("re-measures an entry from an older generation on the way back", () => {
			const { state, staleText } = withStaleTextEntry();
			advanceTextMeasurementGeneration();

			const undone = UndoCommand.execute(state, testReducerRegistries);
			const restoredText = undone.objects["text-1"];

			expect(restoredText).not.toBe(staleText);
			expect(sizeOf(restoredText).width).toBe(
				sizeOf(state.objects["text-1"]).width,
			);
			expect(sizeOf(restoredText).height).toBe(
				sizeOf(state.objects["text-1"]).height,
			);
		});
	});
});
