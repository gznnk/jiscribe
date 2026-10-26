import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { twoRectsDoc } from "./support/fixtures";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createCanvasReducer } from "../canvasReducer";

const canvasReducer = createCanvasReducer(createTestRegistries());

/** The library ids the reducer reads to tell what a stencil panel draws. */
describe("canvasReducer SET_STENCIL_LIBRARY", () => {
	it("adopts the ids the host's library resolves to", () => {
		const state = createTestState(twoRectsDoc);
		const after = canvasReducer(state, {
			type: "SET_STENCIL_LIBRARY",
			categoryIds: ["basic", "flowchart"],
		});
		expect(after.stencilLibraryCategoryIds).toEqual(["basic", "flowchart"]);
	});

	/** Canvas dispatches on every new array; the same ids must not re-render. */
	it("returns the same state for the same ids in a new array", () => {
		const state = createTestState(twoRectsDoc, {
			stencilLibraryCategoryIds: ["basic", "flowchart"],
		});
		expect(
			canvasReducer(state, {
				type: "SET_STENCIL_LIBRARY",
				categoryIds: ["basic", "flowchart"],
			}),
		).toBe(state);
	});

	it("takes a reorder as a change", () => {
		const state = createTestState(twoRectsDoc, {
			stencilLibraryCategoryIds: ["basic", "flowchart"],
		});
		expect(
			canvasReducer(state, {
				type: "SET_STENCIL_LIBRARY",
				categoryIds: ["flowchart", "basic"],
			}).stencilLibraryCategoryIds,
		).toEqual(["flowchart", "basic"]);
	});
});
