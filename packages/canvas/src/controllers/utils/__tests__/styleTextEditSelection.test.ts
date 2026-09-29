import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import { describe, expect, it } from "vitest";

import type { TextSlots } from "../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../CanvasTypes";
import {
	resolveTextEditSelection,
	styleTextEditSelection,
} from "../styleTextEditSelection";

/**
 * What the per-range writers resolve before they style anything. The styling
 * itself is covered through the keystrokes (toggleTextEditFormat.test); what is
 * pinned here is the gate, whose null is what makes a source-language body take
 * a whole-slot write instead.
 */

const RECT_FEATURES: ObjectFeatures = {
	type: "rect",
	geometry: "rect",
	text: "body",
};

const SOURCE_FEATURES: ObjectFeatures = {
	type: "markdown",
	geometry: "rect",
	text: "source",
};

/** An object being edited on its body slot, with the given draft and selection. */
const editingState = (
	features: ObjectFeatures,
	slots: TextSlots,
	text: string,
	selection?: { start: number; end: number },
): CanvasControllerState =>
	({
		commitVersion: 0,
		objects: {
			o1: { id: "o1", type: features.type, features, text: slots },
		},
		textEditState: {
			kind: "shape",
			objectId: "o1",
			slotId: "body",
			text,
			selection,
		},
	}) as unknown as CanvasControllerState;

const bodyOf = (state: CanvasControllerState) =>
	(state.objects.o1 as unknown as { text: TextSlots }).text.body.text;

describe("resolveTextEditSelection", () => {
	it("resolves the selected stretch of an ordinary body", () => {
		const state = editingState(
			RECT_FEATURES,
			{ body: { text: "hello" } },
			"hello",
			{ start: 0, end: 2 },
		);
		expect(resolveTextEditSelection(state)).toMatchObject({
			objectId: "o1",
			slotId: "body",
			content: "hello",
			start: 0,
			end: 2,
		});
	});

	it("finds nothing on a source-language body, whose characters carry no styling", () => {
		const state = editingState(
			SOURCE_FEATURES,
			{ body: { text: "# Title" } },
			"# Title",
			{ start: 0, end: 2 },
		);
		expect(resolveTextEditSelection(state)).toBeNull();
	});

	it("finds nothing when the selection is collapsed", () => {
		const state = editingState(
			RECT_FEATURES,
			{ body: { text: "hello" } },
			"hello",
			{ start: 2, end: 2 },
		);
		expect(resolveTextEditSelection(state)).toBeNull();
	});
});

describe("styleTextEditSelection", () => {
	it("styles the selected characters of an ordinary body", () => {
		const state = editingState(
			RECT_FEATURES,
			{ body: { text: "hello" } },
			"hello",
			{ start: 0, end: 2 },
		);
		expect(bodyOf(styleTextEditSelection(state, { fontSize: 20 }))).toEqual([
			{ text: "he", fontSize: 20 },
			{ text: "llo" },
		]);
	});

	it("hands a source-language body's state straight back, untouched", () => {
		const state = editingState(
			SOURCE_FEATURES,
			{ body: { text: "# Title" } },
			"# Title",
			{ start: 0, end: 2 },
		);
		expect(styleTextEditSelection(state, { fontSize: 20 })).toBe(state);
	});
});
