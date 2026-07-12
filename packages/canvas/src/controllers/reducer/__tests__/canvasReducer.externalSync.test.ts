import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import { createTestRegistries } from "../../setup/createCanvasRegistries";

const registries = createTestRegistries();

const canvasReducer = createCanvasReducer(registries);

const createState = (): CanvasControllerState =>
	createTestState(twoRectsDoc, {
		selectedIds: ["rect-1"],
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

// Fold-backs of our own saves are filtered out upstream (useSyncExternalDoc via
// the self-save nonce tracker), so every SYNC_EXTERNAL the reducer sees is a
// genuine external change.
const syncExternal = (): CanvasAction => ({
	type: "SYNC_EXTERNAL",
	payload: canvasToState(movedDoc, registries.objectMapper),
});

const cxOf = (state: CanvasControllerState) =>
	(state.objects["rect-1"] as unknown as { cx: number }).cx;

describe("canvasReducer (integration)", () => {
	describe("SYNC_EXTERNAL", () => {
		it("a genuine external change pushes present onto past", () => {
			const state = createState();
			const after = canvasReducer(state, syncExternal());

			expect(cxOf(after)).toBe(55);
			expect(after.history.past).toHaveLength(1);
			expect(after.history.future).toHaveLength(0);
		});

		it("an external change acts as a history boundary and resets selection and coalescing state", () => {
			const state = createState();
			const after = canvasReducer(state, syncExternal());

			expect(after.selectedIds).toEqual([]);
			expect(after.historyCoalesce.recorded).toBeNull();
			expect(after.historyCoalesce.pending).toBeNull();
		});
	});
});
