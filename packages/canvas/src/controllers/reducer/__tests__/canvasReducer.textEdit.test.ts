import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import type { RichText } from "../../../schemas/objects/types/RichText";
import {
	isSameRichText,
	remapRichText,
} from "../../../schemas/objects/types/RichText";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import { readRichTextSlot } from "../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createCanvasReducer } from "../canvasReducer";

const canvasReducer = createCanvasReducer(createTestRegistries());

/** A rect whose body mixes a bold run and an unstyled one ("ab", the "a" bold). */
const styledRectDoc: CanvasDoc = {
	version: 1,
	root: [
		{
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 40,
			text: [{ text: "a", fontWeight: "bold" }, { text: "b" }],
		},
	],
} as unknown as CanvasDoc;

/** The styled rect mid-edit on its body slot, the draft still the committed body. */
const editingState = (): CanvasControllerState => {
	const base = createTestState(styledRectDoc);
	return createTestState(styledRectDoc, {
		textEditState: {
			kind: "shape",
			objectId: "rect-1",
			slotId: "body",
			text: readRichTextSlot(
				(base.objects["rect-1"] as unknown as { text: TextSlots }).text,
				"body",
			),
		},
	});
};

const draftOf = (state: CanvasControllerState): RichText => {
	if (state.textEditState?.kind !== "shape") {
		throw new Error("no shape edit session");
	}
	return state.textEditState.text;
};

const typePlain = (
	state: CanvasControllerState,
	plain: string,
): CanvasControllerState =>
	canvasReducer(state, { type: "UPDATE_TEXT_EDIT", text: plain });

describe("canvasReducer UPDATE_TEXT_EDIT", () => {
	it("carries the draft's styling over a keystroke", () => {
		const after = typePlain(editingState(), "axb");
		expect(draftOf(after)).toEqual([
			{ text: "ax", fontWeight: "bold" },
			{ text: "b" },
		]);
	});

	it("does not resurrect the styling of a deleted character when it is retyped", () => {
		// Delete the bold "a", then type it back: the editor shows plain text
		// (nothing styled is left to carry), and the draft has to agree with it.
		const deleted = typePlain(editingState(), "b");
		expect(draftOf(deleted)).toBe("b");
		const retyped = typePlain(deleted, "ab");
		expect(draftOf(retyped)).toBe("ab");
	});

	it("always matches the editor's own prediction of the edit, keystroke by keystroke", () => {
		// The editor predicts each edit as remapRichText(shown, plain) and redraws
		// (dropping the caret) whenever the echoed draft differs, so the reducer has
		// to produce the very same body for every step of an edit sequence.
		const plains = ["b", "ab", "axb", "axby", "ax", "ax\nz"];
		let state = editingState();
		let shown = draftOf(state);
		for (const plain of plains) {
			const prediction = remapRichText(shown, plain);
			state = typePlain(state, plain);
			expect(isSameRichText(draftOf(state), prediction)).toBe(true);
			shown = draftOf(state);
		}
	});
});

describe("canvasReducer END_TEXT_EDIT", () => {
	const bodyOf = (state: CanvasControllerState): RichText =>
		readRichTextSlot(
			(state.objects["rect-1"] as unknown as { text: TextSlots }).text,
			"body",
		);

	it("commits the body the editor showed, styling included", () => {
		const after = canvasReducer(typePlain(editingState(), "axb"), {
			type: "END_TEXT_EDIT",
			commit: true,
		});
		expect(after.textEditState).toBeNull();
		expect(bodyOf(after)).toEqual([
			{ text: "ax", fontWeight: "bold" },
			{ text: "b" },
		]);
	});

	it("commits the styling loss the editor showed, even when the characters read the same", () => {
		// Deleting the bold "a" and retyping it leaves the same characters but a
		// plain body on screen; the commit must not skip as "unchanged" and keep
		// the old styling.
		const retyped = typePlain(typePlain(editingState(), "b"), "ab");
		const after = canvasReducer(retyped, {
			type: "END_TEXT_EDIT",
			commit: true,
		});
		expect(bodyOf(after)).toBe("ab");
	});

	it("closes without a commit when the draft still equals the committed body", () => {
		const after = canvasReducer(editingState(), {
			type: "END_TEXT_EDIT",
			commit: true,
		});
		expect(after.textEditState).toBeNull();
		expect(after.history.past).toHaveLength(0);
	});
});
