import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";
import { twoRectsDoc } from "./support/fixtures";

const canvasReducer = createCanvasReducer(createTestRegistries());

const createState = (
	overrides?: Partial<CanvasControllerState>,
): CanvasControllerState => createTestState(twoRectsDoc, overrides);

const setSelection = (ids: readonly string[]): CanvasAction => ({
	type: "SET_SELECTION",
	ids,
});

describe("canvasReducer / SET_SELECTION", () => {
	it("replaces the selection with the requested ids", () => {
		const state = createState({ selectedIds: ["rect-1"] });

		const next = canvasReducer(state, setSelection(["rect-2"]));

		expect(next.selectedIds).toEqual(["rect-2"]);
	});

	it("builds the multi-select group for two or more objects", () => {
		const next = canvasReducer(
			createState(),
			setSelection(["rect-1", "rect-2"]),
		);

		expect(next.selectedIds).toEqual(["rect-1", "rect-2"]);
		expect(next.multiSelectGroup).not.toBeNull();
	});

	it("clears the selection and its group for an empty list", () => {
		const state = canvasReducer(
			createState(),
			setSelection(["rect-1", "rect-2"]),
		);

		const next = canvasReducer(state, setSelection([]));

		expect(next.selectedIds).toEqual([]);
		expect(next.multiSelectGroup).toBeNull();
	});

	it("ignores ids that are not on the canvas", () => {
		const next = canvasReducer(createState(), setSelection(["gone", "rect-1"]));

		expect(next.selectedIds).toEqual(["rect-1"]);
	});

	it("clears the UI hanging off the previous selection", () => {
		const state = createState({
			selectedIds: [],
			selectedConnectorId: "conn-1",
			objectMenuOpenId: "rect-1",
		});

		const next = canvasReducer(state, setSelection(["rect-1"]));

		expect(next.selectedConnectorId).toBeNull();
		expect(next.selectedVertex).toBeNull();
		expect(next.selectedTextSlot).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
	});

	it("does not record history or bump save/commit versions (selection is not part of the doc)", () => {
		const state = createState();

		const next = canvasReducer(state, setSelection(["rect-1"]));

		expect(next.history).toBe(state.history);
		expect(next.saveVersion).toBe(state.saveVersion);
		expect(next.commitVersion).toBe(state.commitVersion);
	});
});
