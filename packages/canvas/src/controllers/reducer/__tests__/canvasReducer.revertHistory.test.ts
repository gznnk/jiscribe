import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { applyActions, command } from "./support/dispatch";
import { rectDoc } from "./support/fixtures";
import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import type { CanvasControllerState, DocSnapshot } from "../../CanvasTypes";
import { createDocSnapshotFromDoc } from "../../utils/resolveDocSnapshot";
import type { CanvasAction } from "../CanvasActions";

/**
 * REVERT_HISTORY stands in for however many undos it takes to reach an entry, so
 * what it must guarantee is that the two are indistinguishable afterwards — the
 * document, and both stacks down to the identity and order of every entry that
 * moved. Only the number of rebuilds along the way differs, which no assertion
 * here can see.
 */

/** A doc holding one rect at the given x, so each entry is told apart by it. */
const docAt = (x: number): CanvasDoc =>
	({ version: 1, root: [rectDoc("rect-1", x, 0)] }) as unknown as CanvasDoc;

/** past = [oldest, middle, newest], present = current, future = [ahead]. */
const entries = {
	oldest: createDocSnapshotFromDoc(docAt(0)),
	middle: createDocSnapshotFromDoc(docAt(10)),
	newest: createDocSnapshotFromDoc(docAt(20)),
	current: createDocSnapshotFromDoc(docAt(30)),
	ahead: createDocSnapshotFromDoc(docAt(40)),
};

const createState = (
	overrides?: Partial<CanvasControllerState>,
): CanvasControllerState =>
	createTestState(docAt(30), {
		history: {
			past: [entries.oldest, entries.middle, entries.newest],
			present: entries.current,
			future: [entries.ahead],
		},
		...overrides,
	});

const revertTo = (entry: DocSnapshot): CanvasAction => ({
	type: "REVERT_HISTORY",
	entry,
});

/** Center x of the fixture rect, which is 10 wide, so `docAt(x)` reads back x + 5. */
const cxOf = (state: CanvasControllerState) =>
	(state.objects["rect-1"] as unknown as { cx: number }).cx;

describe("canvasReducer (integration)", () => {
	describe("REVERT_HISTORY", () => {
		it("leaves the same stacks as undoing one entry at a time", () => {
			const state = createState();
			const undone = applyActions(state, [
				command("undo"),
				command("undo"),
				command("undo"),
			]);
			const reverted = applyActions(state, [revertTo(entries.oldest)]);

			expect(reverted.history.past).toEqual(undone.history.past);
			expect(reverted.history.present).toBe(undone.history.present);
			expect(reverted.history.future).toEqual(undone.history.future);
			expect(reverted.objects).toEqual(undone.objects);
		});

		it("puts the entries it passed over back in redo order, oldest first", () => {
			const reverted = applyActions(createState(), [revertTo(entries.oldest)]);

			expect(reverted.history.past).toEqual([]);
			expect(reverted.history.present).toBe(entries.oldest);
			// Everything after the target, then the state left behind, then what was
			// already ahead — so one redo steps forward by one entry.
			expect(reverted.history.future).toEqual([
				entries.middle,
				entries.newest,
				entries.current,
				entries.ahead,
			]);
		});

		it("restores the document the target entry holds", () => {
			const reverted = applyActions(createState(), [revertTo(entries.middle)]);

			expect(cxOf(reverted)).toBe(15);
			expect(reverted.history.past).toEqual([entries.oldest]);
		});

		it("is a no-op for an entry that is not on the undo stack", () => {
			const state = createState();
			// Already the present one, and one that was never in this history at all.
			expect(applyActions(state, [revertTo(entries.current)])).toBe(state);
			expect(applyActions(state, [revertTo(entries.ahead)])).toBe(state);
			expect(
				applyActions(state, [revertTo(createDocSnapshotFromDoc(docAt(99)))]),
			).toBe(state);
		});

		it("is a no-op while a text edit is open, like undo itself", () => {
			const state = createState({
				textEditState: {
					kind: "shape",
					objectId: "rect-1",
					slotId: "body",
					text: "",
				},
			} as Partial<CanvasControllerState>);

			expect(applyActions(state, [revertTo(entries.oldest)])).toBe(state);
		});

		it("is a no-op while a drag is in progress, like undo itself", () => {
			const state = createState({
				eventStartSnapshot: {},
			} as Partial<CanvasControllerState>);

			expect(applyActions(state, [revertTo(entries.oldest)])).toBe(state);
		});

		it("requests a save without recording a commit", () => {
			const state = createState();
			const reverted = applyActions(state, [revertTo(entries.oldest)]);

			// Restoring is not a new edit, but the file no longer matches what is on
			// screen — the same pairing undo makes.
			expect(reverted.commitVersion).toBe(state.commitVersion);
			expect(reverted.saveVersion).toBe(state.saveVersion + 1);
		});

		it("keeps the viewport and an open modal, and drops the selection", () => {
			const state = createState({
				selectedIds: ["rect-1"],
				activeModal: "export",
				viewport: { minX: 7, minY: 9, width: 800, height: 600, zoom: 2 },
			});
			const reverted = applyActions(state, [revertTo(entries.oldest)]);

			expect(reverted.viewport).toEqual(state.viewport);
			expect(reverted.activeModal).toBe("export");
			expect(reverted.selectedIds).toEqual([]);
		});
	});
});
