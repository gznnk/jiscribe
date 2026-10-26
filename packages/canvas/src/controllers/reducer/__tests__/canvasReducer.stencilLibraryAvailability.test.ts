import { describe, expect, it } from "vitest";

import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { createCanvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";
import { runCommands } from "./support/dispatch";
import { twoRectsDoc } from "./support/fixtures";

const canvasReducer = createCanvasReducer(createTestRegistries());

describe("canvasReducer / SET_STENCIL_LIBRARY_AVAILABILITY", () => {
	it("starts with no library until Canvas reports one", () => {
		expect(createTestState(twoRectsDoc).hasStencilLibrary).toBe(false);
	});

	it("records whether a library can be drawn, both ways", () => {
		const declared = canvasReducer(createTestState(twoRectsDoc), {
			type: "SET_STENCIL_LIBRARY_AVAILABILITY",
			hasStencilLibrary: true,
		});
		expect(declared.hasStencilLibrary).toBe(true);

		const withdrawn = canvasReducer(declared, {
			type: "SET_STENCIL_LIBRARY_AVAILABILITY",
			hasStencilLibrary: false,
		});
		expect(withdrawn.hasStencilLibrary).toBe(false);
	});

	it("returns the same state when the answer did not change", () => {
		const state = createTestState(twoRectsDoc);
		expect(
			canvasReducer(state, {
				type: "SET_STENCIL_LIBRARY_AVAILABILITY",
				hasStencilLibrary: false,
			}),
		).toBe(state);
	});

	/** A host fact, so stepping through the document's history keeps it. */
	it("survives undo and redo", () => {
		let state = createTestState(twoRectsDoc, {
			selection: selectionOf(["rect-1"]),
			hasStencilLibrary: true,
		});
		state = runCommands(state, "move-right", "undo");
		expect(state.hasStencilLibrary).toBe(true);
		state = runCommands(state, "redo");
		expect(state.hasStencilLibrary).toBe(true);
	});
});
