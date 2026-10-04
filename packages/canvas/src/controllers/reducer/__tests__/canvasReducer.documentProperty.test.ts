import type { ViewDoc } from "@jiscribe/doc/model/canvas/ViewDoc";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { twoRectsDoc } from "./support/fixtures";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import type { DocumentPropertyUpdate } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";

const canvasReducer = createCanvasReducer(createTestRegistries());

const update = (
	state: CanvasControllerState,
	value: string | null,
	options: { commit?: boolean; coalesceHistory?: boolean } = {},
): CanvasControllerState =>
	canvasReducer(state, {
		type: "DOCUMENT_PROPERTY_UPDATE",
		property: "background",
		value,
		commit: options.commit ?? true,
		coalesceHistory: options.coalesceHistory,
	});

const updateDocument = (
	state: CanvasControllerState,
	documentUpdate: DocumentPropertyUpdate,
	options: { commit?: boolean; coalesceHistory?: boolean } = {},
): CanvasControllerState =>
	canvasReducer(state, {
		type: "DOCUMENT_PROPERTY_UPDATE",
		...documentUpdate,
		commit: options.commit ?? true,
		coalesceHistory: options.coalesceHistory,
	});

/** Nothing selected, which is when the Canvas section is the one on screen. */
const emptySelectionState = (background?: string): CanvasControllerState =>
	createTestState({ ...twoRectsDoc, ...(background ? { background } : {}) });

describe("canvasReducer / DOCUMENT_PROPERTY_UPDATE", () => {
	it("states the surface color", () => {
		const state = update(emptySelectionState(), "#102030");

		expect(state.background).toBe("#102030");
	});

	it("clears the surface color on null, so the theme decides again", () => {
		const state = update(emptySelectionState("#102030"), null);

		expect(state.background).toBeUndefined();
	});

	it("leaves a preview of the color already set untouched", () => {
		const before = emptySelectionState("#102030");

		expect(update(before, "#102030", { commit: false })).toBe(before);
	});

	it("leaves a preview clearing a background there is none of untouched", () => {
		const before = emptySelectionState();

		expect(update(before, null, { commit: false })).toBe(before);
	});

	it("records the commit of a color the preview already applied", () => {
		const previewed = update(emptySelectionState(), "#102030", {
			commit: false,
		});
		expect(previewed.history.past).toHaveLength(0);

		const committed = update(previewed, "#102030");
		expect(committed.history.past).toHaveLength(1);
		expect(committed.commitVersion).toBe(previewed.commitVersion + 1);
	});

	it("previews without recording history", () => {
		const before = emptySelectionState();

		const state = update(before, "#102030", { commit: false });

		expect(state.background).toBe("#102030");
		expect(state.history.past).toHaveLength(0);
		expect(state.commitVersion).toBe(before.commitVersion);
	});

	it("records one history entry per commit", () => {
		let state = update(emptySelectionState(), "#102030");
		expect(state.history.past).toHaveLength(1);

		state = update(state, "#405060");
		expect(state.history.past).toHaveLength(2);
	});

	it("merges consecutive commits asking to coalesce into one entry", () => {
		let state = update(emptySelectionState(), "#102030", {
			coalesceHistory: true,
		});
		expect(state.history.past).toHaveLength(1);

		state = update(state, "#405060", { coalesceHistory: true });
		state = update(state, "#708090", { coalesceHistory: true });

		expect(state.history.past).toHaveLength(1);
		expect(state.background).toBe("#708090");
	});

	it("does not merge into a menu commit of the same name", () => {
		let state = canvasReducer(
			createTestState(twoRectsDoc, { selection: selectionOf(["rect-1"]) }),
			{
				type: "STYLE_PROPERTY_UPDATE",
				property: "background",
				value: "#102030",
				commit: true,
				coalesceHistory: true,
			},
		);
		const menuEntries = state.history.past.length;

		state = update(state, "#405060", { coalesceHistory: true });

		expect(state.history.past).toHaveLength(menuEntries + 1);
	});

	it("undoes a committed color in one step", () => {
		let state = update(emptySelectionState("#102030"), "#405060");

		state = canvasReducer(state, { type: "COMMAND", commandId: "undo" });

		expect(state.background).toBe("#102030");
	});

	it("undoes a stated color back to none at all", () => {
		let state = update(emptySelectionState(), "#405060");

		state = canvasReducer(state, { type: "COMMAND", commandId: "undo" });

		expect(state.background).toBeUndefined();
	});
});

describe("canvasReducer / DOCUMENT_PROPERTY_UPDATE (view)", () => {
	const viewState = (view?: ViewDoc): CanvasControllerState =>
		createTestState({ ...twoRectsDoc, ...(view ? { view } : {}) });

	it("states one padding side, keeping the sides already declared", () => {
		const state = updateDocument(viewState({ padding: { top: 40 } }), {
			property: "view.padding.left",
			value: 16,
		});

		expect(state.view).toEqual({ padding: { top: 40, left: 16 } });
	});

	it("drops a side set to 0, and the view once nothing is left", () => {
		const state = updateDocument(viewState({ padding: { top: 40 } }), {
			property: "view.padding.top",
			value: 0,
		});

		expect(state.view).toBeUndefined();
		expect(state.history.past).toHaveLength(1);
	});

	it("states the open and scroll modes, and drops them on null", () => {
		let state = updateDocument(viewState(), {
			property: "view.open",
			value: "fit-width",
		});
		state = updateDocument(state, {
			property: "view.scroll",
			value: "content",
		});
		expect(state.view).toEqual({ open: "fit-width", scroll: "content" });

		state = updateDocument(state, { property: "view.open", value: null });
		expect(state.view).toEqual({ scroll: "content" });
	});

	it("previews without recording history, and leaves an unchanged preview untouched", () => {
		const before = viewState({ padding: { top: 40 } });

		const previewed = updateDocument(
			before,
			{ property: "view.padding.top", value: 64 },
			{ commit: false },
		);
		expect(previewed.view).toEqual({ padding: { top: 64 } });
		expect(previewed.history.past).toHaveLength(0);
		expect(previewed.commitVersion).toBe(before.commitVersion);

		expect(
			updateDocument(
				before,
				{ property: "view.padding.top", value: 40 },
				{ commit: false },
			),
		).toBe(before);
	});

	it("refuses a negative or non-finite side, even on commit", () => {
		const before = viewState({ padding: { top: 40 } });

		expect(
			updateDocument(before, { property: "view.padding.top", value: -1 }),
		).toBe(before);
		expect(
			updateDocument(before, {
				property: "view.padding.top",
				value: Number.NaN,
			}),
		).toBe(before);
	});

	it("coalesces a burst on one side, but not across sides", () => {
		let state = updateDocument(
			viewState(),
			{ property: "view.padding.top", value: 1 },
			{ coalesceHistory: true },
		);
		state = updateDocument(
			state,
			{ property: "view.padding.top", value: 2 },
			{ coalesceHistory: true },
		);
		expect(state.history.past).toHaveLength(1);

		state = updateDocument(
			state,
			{ property: "view.padding.right", value: 3 },
			{ coalesceHistory: true },
		);
		expect(state.history.past).toHaveLength(2);
		expect(state.view).toEqual({ padding: { top: 2, right: 3 } });
	});

	it("undoes a stated view back to none at all", () => {
		let state = updateDocument(viewState(), {
			property: "view.scroll",
			value: "content",
		});

		state = canvasReducer(state, { type: "COMMAND", commandId: "undo" });

		expect(state.view).toBeUndefined();
	});
});
