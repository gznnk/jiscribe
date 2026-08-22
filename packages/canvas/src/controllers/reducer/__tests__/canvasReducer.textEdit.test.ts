import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { RichText } from "@jiscribe/doc/model/objects/types/RichText";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
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

/** Dispatches the body the editor read off its surface after an edit. */
const reportEdit = (
	state: CanvasControllerState,
	text: RichText,
): CanvasControllerState =>
	canvasReducer(state, { type: "UPDATE_TEXT_EDIT", text });

describe("canvasReducer UPDATE_TEXT_EDIT", () => {
	it("holds the reported body verbatim, in canonical form", () => {
		// The editor reads its surface (readEditableRichText) and reports what is
		// on screen; the reducer's job is to hold exactly that, not to re-derive it.
		const after = reportEdit(editingState(), [
			{ text: "ax", fontWeight: "bold" },
			{ text: "b" },
			{ text: "" },
		]);
		expect(draftOf(after)).toEqual([
			{ text: "ax", fontWeight: "bold" },
			{ text: "b" },
		]);
	});

	it("holds a plain body as a plain string", () => {
		// A surface whose styled characters were all deleted reads back plain, and
		// the draft must not resurrect the styling they carried.
		const after = reportEdit(editingState(), "ab");
		expect(draftOf(after)).toBe("ab");
	});
});

describe("canvasReducer END_TEXT_EDIT", () => {
	const bodyOf = (state: CanvasControllerState): RichText =>
		readRichTextSlot(
			(state.objects["rect-1"] as unknown as { text: TextSlots }).text,
			"body",
		);

	it("commits the body the editor showed, styling included", () => {
		const after = canvasReducer(
			reportEdit(editingState(), [
				{ text: "ax", fontWeight: "bold" },
				{ text: "b" },
			]),
			{ type: "END_TEXT_EDIT", commit: true },
		);
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
		const after = canvasReducer(reportEdit(editingState(), "ab"), {
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
