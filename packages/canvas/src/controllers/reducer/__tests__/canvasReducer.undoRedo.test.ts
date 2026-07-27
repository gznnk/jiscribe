import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestState } from "./support/createTestState";
import { runCommands } from "./support/dispatch";
import { twoRectsDoc } from "./support/fixtures";

// Start with rect-1 selected (cx=5, cy=5)
const createState = (): CanvasControllerState =>
	createTestState(twoRectsDoc, { selectedIds: ["rect-1"] });

const cxOf = (state: CanvasControllerState) =>
	(state.objects["rect-1"] as unknown as { cx: number }).cx;

describe("canvasReducer (integration)", () => {
	describe("undo / redo", () => {
		it("undo reverts the previous commit and redo reapplies it", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			expect(cxOf(state)).toBe(6);
			expect(state.history.past).toHaveLength(1);

			state = runCommands(state, "undo");
			expect(cxOf(state)).toBe(5); // reverts to before the nudge
			expect(state.history.past).toHaveLength(0);
			expect(state.history.future).toHaveLength(1);

			state = runCommands(state, "redo");
			expect(cxOf(state)).toBe(6); // reapplied
			expect(state.history.past).toHaveLength(1);
			expect(state.history.future).toHaveLength(0);
		});

		it("undo/redo do not advance commitVersion and are not double-pushed onto history", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			const committedVersion = state.commitVersion;

			state = runCommands(state, "undo");
			expect(state.commitVersion).toBe(committedVersion);
			// undo itself does not grow past, it only moves entries to future
			expect(state.history.past).toHaveLength(0);

			state = runCommands(state, "redo");
			expect(state.commitVersion).toBe(committedVersion);
			expect(state.history.past).toHaveLength(1);
		});

		it("undo is a no-op when past is empty (state does not change)", () => {
			const state = createState();
			const after = runCommands(state, "undo");
			expect(after).toBe(state); // unchanged by reference
		});

		it("redo is a no-op when future is empty (state does not change)", () => {
			const state = createState();
			const after = runCommands(state, "redo");
			expect(after).toBe(state); // unchanged by reference
		});

		it("undo/redo are rejected with canExecute=false while editing text", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			// Reproduce a state where an editing session has started
			state = {
				...state,
				textEditState: {
					kind: "shape",
					objectId: "rect-1",
					slotId: "body",
					text: "editing",
				},
			};

			// undo while editing is a no-op (past is not consumed)
			const afterUndo = runCommands(state, "undo");
			expect(afterUndo).toBe(state);
			expect(afterUndo.history.past).toHaveLength(1);
		});

		it("delete → undo restores the deleted object", () => {
			let state = createState();
			expect(state.objects["rect-1"]).toBeDefined();

			state = runCommands(state, "delete");
			expect(state.objects["rect-1"]).toBeUndefined();

			state = runCommands(state, "undo");
			expect(state.objects["rect-1"]).toBeDefined();
			expect(cxOf(state)).toBe(5); // restored at the pre-delete position
		});

		it("coalesced nudge → undo → redo restores the entire coalesced result", () => {
			let state = createState();
			state = runCommands(state, "move-right", "move-right", "move-right");
			expect(cxOf(state)).toBe(8); // 5 + 1*3 (a single coalesced entry)
			expect(state.history.past).toHaveLength(1);

			state = runCommands(state, "undo");
			expect(cxOf(state)).toBe(5); // reverts the whole coalesced batch at once

			state = runCommands(state, "redo");
			expect(cxOf(state)).toBe(8); // the entire coalesced result is restored
		});

		it("making a new commit after undo clears future", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			state = runCommands(state, "undo");
			expect(state.history.future).toHaveLength(1);

			// undo clears the selection, so re-select rect-1 before the new operation
			state = { ...state, selectedIds: ["rect-1"] };
			// Discard the branch restored by undo and fork history with a new operation
			state = runCommands(state, "delete");
			expect(state.history.future).toHaveLength(0);
			expect(state.history.past).toHaveLength(1);
		});

		it("undo resets the coalescing state because it is history navigation", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			// recorded is set by the previous nudge
			expect(state.historyCoalesce.recorded).not.toBeNull();

			state = runCommands(state, "undo");
			expect(state.historyCoalesce.recorded).toBeNull();
			expect(state.historyCoalesce.pending).toBeNull();
		});
	});
});
