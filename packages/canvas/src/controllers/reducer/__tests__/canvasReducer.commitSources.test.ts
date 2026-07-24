import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestState } from "./support/createTestState";
import { runCommands } from "./support/dispatch";
import { twoRectsDoc } from "./support/fixtures";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";

const canvasReducer = createCanvasReducer(createTestRegistries());

const createState = (): CanvasControllerState =>
	createTestState(twoRectsDoc, { selectedIds: ["rect-1"] });

/**
 * A test that surveys in one place whether each event source "records history".
 * Verifies that the paths going through recordHistoryIfNeeded
 * (COMMAND/PASTE/MENU/END_TEXT_EDIT) only push onto past when commitVersion changes.
 * GESTURE also shares the same recordHistoryIfNeeded plumbing as COMMAND in
 * canvasReducer, so here we do not build individual gestures and instead use a
 * representative path as a substitute.
 */
describe("canvasReducer (integration)", () => {
	describe("history recording per commit source", () => {
		it("COMMAND (delete) records history", () => {
			const state = createState();
			const after = runCommands(state, "delete");
			expect(after.history.past).toHaveLength(1);
		});

		it("a command with canExecute=false (undo with empty past) does not record", () => {
			const state = createState();
			const after = runCommands(state, "undo");
			expect(after.history.past).toHaveLength(0);
			expect(after).toBe(state); // state is unchanged
		});

		it("PASTE records history", () => {
			const state = createState();
			// Build ClipboardData that passes validation using the real state's objects
			const clipboard: ClipboardData = {
				__type: "jiscribe-canvas-clipboard",
				version: 1,
				objects: { "rect-2": state.objects["rect-2"] },
				rootIds: ["rect-2"],
				center: { x: 105, y: 105 },
			};
			const paste: CanvasAction = { type: "PASTE", data: clipboard };
			const after = canvasReducer(state, paste);
			expect(after.history.past).toHaveLength(1);
		});

		it("MENU_PROPERTY_UPDATE records with commit:true and does not record with commit:false (preview)", () => {
			const state = createState();

			const preview = canvasReducer(state, {
				type: "MENU_PROPERTY_UPDATE",
				property: "fill",
				value: "#ff0000",
				commit: false,
			});
			expect(preview.history.past).toHaveLength(0);

			const committed = canvasReducer(state, {
				type: "MENU_PROPERTY_UPDATE",
				property: "fill",
				value: "#ff0000",
				commit: true,
			});
			expect(committed.history.past).toHaveLength(1);
		});

		it("END_TEXT_EDIT records when the text changes on commit", () => {
			const state = createTestState(twoRectsDoc, {
				selectedIds: ["rect-1"],
				textEditState: { objectId: "rect-1", text: "hello" },
			});
			const after = canvasReducer(state, {
				type: "END_TEXT_EDIT",
				commit: true,
			});
			expect(after.history.past).toHaveLength(1);
			expect(after.textEditState).toBeNull();
		});

		it("cancelling END_TEXT_EDIT does not record and only clears textEditState", () => {
			const state = createTestState(twoRectsDoc, {
				selectedIds: ["rect-1"],
				textEditState: { objectId: "rect-1", text: "hello" },
			});
			const after = canvasReducer(state, {
				type: "END_TEXT_EDIT",
				commit: false,
			});
			expect(after.history.past).toHaveLength(0);
			expect(after.textEditState).toBeNull();
		});

		it("END_TEXT_EDIT does not record on commit if the text has not changed", () => {
			let state = createTestState(twoRectsDoc, {
				selectedIds: ["rect-1"],
				textEditState: { objectId: "rect-1", text: "hello" },
			});
			// First time: the text changes, so it is recorded
			state = canvasReducer(state, { type: "END_TEXT_EDIT", commit: true });
			expect(state.history.past).toHaveLength(1);

			// Commit again with the same text → no diff, so commitVersion does not increase and nothing is recorded
			state = {
				...state,
				textEditState: { objectId: "rect-1", text: "hello" },
			};
			state = canvasReducer(state, { type: "END_TEXT_EDIT", commit: true });
			expect(state.history.past).toHaveLength(1);
			expect(state.textEditState).toBeNull();
		});

		it("MENU_PROPERTY_UPDATE records only once even when preview → commit follow in sequence", () => {
			let state = createState();
			// Preview (commit:false) does not record
			state = canvasReducer(state, {
				type: "MENU_PROPERTY_UPDATE",
				property: "fill",
				value: "#ff0000",
				commit: false,
			});
			expect(state.history.past).toHaveLength(0);

			// Only on commit (commit:true) is one entry pushed (the preview is not double-counted)
			state = canvasReducer(state, {
				type: "MENU_PROPERTY_UPDATE",
				property: "fill",
				value: "#ff0000",
				commit: true,
			});
			expect(state.history.past).toHaveLength(1);
		});
	});
});
