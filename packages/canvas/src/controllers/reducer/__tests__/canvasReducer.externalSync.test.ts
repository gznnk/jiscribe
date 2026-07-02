import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { CanvasAction } from "../CanvasActions";
import { canvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";

beforeAll(() => {
	initializeObjectRegistry();
});

const createState = (): CanvasControllerState =>
	createTestState(twoRectsDoc, {
		selectedIds: ["rect-1"],
		saveNonce: "nonce-self",
		// Reproduce a situation where a coalescing marker remains from the previous operation
		historyCoalesce: {
			recorded: { key: "move:rect-1", time: Date.now() },
			pending: null,
		},
	});

// An external document with rect-1 moved to x=50 (converted to cx=55)
const movedDoc: CanvasDoc = {
	version: 1,
	root: [rectDoc("rect-1", 50, 0), rectDoc("rect-2", 100, 100)],
} as unknown as CanvasDoc;

const syncExternal = (saveNonce?: string): CanvasAction => ({
	type: "SYNC_EXTERNAL",
	payload: canvasToState(movedDoc),
	saveNonce,
});

const cxOf = (state: CanvasControllerState) =>
	(state.objects["rect-1"] as unknown as { cx: number }).cx;

describe("canvasReducer (integration)", () => {
	describe("SYNC_EXTERNAL", () => {
		it("a self-echo with a matching saveNonce only updates objects and preserves history", () => {
			const state = createState();
			const after = canvasReducer(state, syncExternal("nonce-self"));

			// objects are replaced by the external payload
			expect(cxOf(after)).toBe(55);
			// history is never touched (nothing pushed onto past)
			expect(after.history).toBe(state.history);
			// coalescing state and selection are also preserved
			expect(after.historyCoalesce).toBe(state.historyCoalesce);
			expect(after.selectedIds).toEqual(["rect-1"]);
		});

		it("a genuine external change with a non-matching saveNonce pushes present onto past", () => {
			const state = createState();
			const after = canvasReducer(state, syncExternal("nonce-other"));

			expect(cxOf(after)).toBe(55);
			expect(after.history.past).toHaveLength(1);
			expect(after.history.future).toHaveLength(0);
		});

		it("treats it as an external change even when saveNonce is omitted", () => {
			const state = createState();
			const after = canvasReducer(state, syncExternal(undefined));
			expect(after.history.past).toHaveLength(1);
		});

		it("an external change acts as a history boundary and resets selection and coalescing state", () => {
			const state = createState();
			const after = canvasReducer(state, syncExternal("nonce-other"));

			expect(after.selectedIds).toEqual([]);
			expect(after.historyCoalesce.recorded).toBeNull();
			expect(after.historyCoalesce.pending).toBeNull();
		});
	});
});
