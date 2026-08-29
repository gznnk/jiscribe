import { afterEach, describe, expect, it, vi } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestState } from "./support/createTestState";
import { runCommands, testReducerRegistries } from "./support/dispatch";
import { twoRectsDoc } from "./support/fixtures";
import { resolveDocSnapshot } from "../../utils/resolveDocSnapshot";

// Start with rect-1 selected (cx=5, cy=5)
const createState = (): CanvasControllerState =>
	createTestState(twoRectsDoc, { selectedIds: ["rect-1"] });

const cxOf = (state: CanvasControllerState) =>
	(state.objects["rect-1"] as unknown as { cx: number }).cx;

describe("canvasReducer (integration)", () => {
	describe("history coalescing (consecutive nudges)", () => {
		it("consecutive nudges are merged into a single entry without growing past", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			// First time: the pre-move state is pushed onto past
			expect(state.history.past).toHaveLength(1);

			state = runCommands(state, "move-right", "move-right");
			// The 2nd and 3rd are coalesced, so past does not grow
			expect(state.history.past).toHaveLength(1);
			expect(cxOf(state)).toBe(8); // 5 + 1 * 3
		});

		it("a single undo after coalescing reverts to before the nudges", () => {
			let state = createState();
			state = runCommands(state, "move-right", "move-right");
			expect(cxOf(state)).toBe(7);

			state = runCommands(state, "undo");
			expect(cxOf(state)).toBe(5); // reverts all the way to before the nudges
			expect(state.history.past).toHaveLength(0);
		});

		it("interposing another operation (delete) becomes a coalescing boundary, producing a separate entry", () => {
			let state = createState();
			state = runCommands(state, "move-right", "move-right");
			expect(state.history.past).toHaveLength(1);

			state = runCommands(state, "delete");
			// Delete does not set pending, so past grows and recorded also becomes a coalescing boundary (null)
			expect(state.history.past).toHaveLength(2);
			expect(state.historyCoalesce.recorded).toBeNull();
			expect(state.historyCoalesce.pending).toBeNull();
		});

		it("nudges in different directions are still coalesced as consecutive nudges", () => {
			let state = createState();
			state = runCommands(state, "move-right", "move-up", "move-left-large");
			expect(state.history.past).toHaveLength(1);
		});

		it("nudging after selecting a different shape produces a separate undo entry (no coalescing across selections)", () => {
			let state = createState(); // rect-1 selected
			state = runCommands(state, "move-right", "move-right");
			expect(state.history.past).toHaveLength(1);

			// Select a different shape (simulating a click selection; the coalescing key changes to move:rect-2)
			state = { ...state, selectedIds: ["rect-2"] };
			state = runCommands(state, "move-right");
			expect(state.history.past).toHaveLength(2);
		});

		it("nudge commits never rebuild the Doc tree (history snapshots stay lazy)", () => {
			let state = createState();
			const toDocSpy = vi.spyOn(testReducerRegistries.objectMapper, "toDoc");

			// Simulates key repeat: neither the first commit nor the coalesced
			// followers may pay the O(N) canvasToDoc cost (issue #125)
			state = runCommands(state, "move-right", "move-right", "move-right");
			expect(toDocSpy).not.toHaveBeenCalled();
			toDocSpy.mockRestore();

			// The lazy present still resolves to the committed positions
			const presentDoc = resolveDocSnapshot(
				state.history.present,
				testReducerRegistries.objectMapper,
			);
			expect(presentDoc.root[0]).toMatchObject({ id: "rect-1", x: 3 });
		});

		it("past snapshots resolve to their historical states even after later edits", () => {
			vi.useFakeTimers();
			let state = createState();
			state = runCommands(state, "move-right");

			// Beyond the coalescing window: the next nudge becomes a separate entry
			vi.advanceTimersByTime(1500);
			state = runCommands(state, "move-right");
			expect(state.history.past).toHaveLength(2);

			// Each snapshot reflects the state at its own commit, proving later
			// (immutable) updates cannot leak into stored history entries
			const initialDoc = resolveDocSnapshot(
				state.history.past[0],
				testReducerRegistries.objectMapper,
			);
			const firstNudgeDoc = resolveDocSnapshot(
				state.history.past[1],
				testReducerRegistries.objectMapper,
			);
			expect(initialDoc.root[0]).toMatchObject({ id: "rect-1", x: 0 });
			expect(firstNudgeDoc.root[0]).toMatchObject({ id: "rect-1", x: 1 });
			expect(cxOf(state)).toBe(7);
		});

		it("a same-direction nudge beyond the coalescing window (1000ms) produces a separate entry", () => {
			vi.useFakeTimers();
			let state = createState();
			state = runCommands(state, "move-right");
			expect(state.history.past).toHaveLength(1);

			// Even with the same key (move:rect-1), it is not coalesced once 1000ms has elapsed since the last commit
			vi.advanceTimersByTime(1500);
			state = runCommands(state, "move-right");
			expect(state.history.past).toHaveLength(2);
		});
	});
});

afterEach(() => {
	vi.useRealTimers();
});
