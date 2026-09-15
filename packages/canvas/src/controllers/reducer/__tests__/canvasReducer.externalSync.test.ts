import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";

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
	payload: canvasToState(
		movedDoc,
		registries.objectMapper,
		registries.objectContentResizer,
	),
});

// The document a host swaps in when a person opens another file: nothing of the
// one on screen is left in it.
const otherDoc: CanvasDoc = {
	version: 1,
	root: [rectDoc("rect-9", 200, 200)],
} as unknown as CanvasDoc;

const loadDocument = (doc: CanvasDoc): CanvasAction => ({
	type: "LOAD_DOCUMENT",
	payload: canvasToState(
		doc,
		registries.objectMapper,
		registries.objectContentResizer,
	),
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

	describe("LOAD_DOCUMENT", () => {
		it("drops both history stacks, so no undo reaches the previous document", () => {
			const state = canvasReducer(createState(), syncExternal());
			expect(state.history.past).toHaveLength(1);

			const after = canvasReducer(state, loadDocument(otherDoc));

			expect(after.history.past).toEqual([]);
			expect(after.history.future).toEqual([]);
		});

		it("makes the loaded document the present entry", () => {
			const after = canvasReducer(createState(), loadDocument(otherDoc));

			expect(Object.keys(after.objects)).toEqual(["rect-9"]);
			expect(after.rootIds).toEqual(["rect-9"]);
			expect(after.history.present.source?.rootIds).toEqual(["rect-9"]);
		});

		it("resets selection and coalescing state, keeping the viewport", () => {
			const state = createState();
			const after = canvasReducer(state, loadDocument(otherDoc));

			expect(after.selectedIds).toEqual([]);
			expect(after.historyCoalesce.recorded).toBeNull();
			expect(after.historyCoalesce.pending).toBeNull();
			expect(after.viewport).toBe(state.viewport);
		});
	});
});
