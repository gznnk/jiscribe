import { describe, expect, it } from "vitest";

import type { TextSlots } from "../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../CanvasTypes";
import { toggleTextEditFormat } from "../toggleTextEditFormat";

type MinState = Pick<
	CanvasControllerState,
	"textEditState" | "objects" | "commitVersion"
>;

const makeState = (overrides: Partial<MinState> = {}): CanvasControllerState =>
	({
		textEditState: null,
		objects: {},
		commitVersion: 0,
		...overrides,
	}) as unknown as CanvasControllerState;

/** A rect being edited on its body slot, with the given draft and selection. */
const editingState = (
	slots: TextSlots,
	text: string,
	selection?: { start: number; end: number },
): CanvasControllerState =>
	makeState({
		objects: {
			r1: { id: "r1", type: "rect", text: slots } as unknown,
		} as CanvasControllerState["objects"],
		textEditState: {
			kind: "shape",
			objectId: "r1",
			slotId: "body",
			text,
			selection,
		},
	});

const bodyOf = (state: CanvasControllerState) =>
	(state.objects.r1 as unknown as { text: TextSlots }).text.body.text;

describe("toggleTextEditFormat", () => {
	it("styles only the selected characters", () => {
		const state = editingState({ body: { text: "hello" } }, "hello", {
			start: 0,
			end: 2,
		});
		expect(bodyOf(toggleTextEditFormat(state, "bold"))).toEqual([
			{ text: "he", fontWeight: "bold" },
			{ text: "llo" },
		]);
	});

	it("turns the format back off on a second press", () => {
		const state = editingState({ body: { text: "hello" } }, "hello", {
			start: 0,
			end: 2,
		});
		const bold = toggleTextEditFormat(state, "bold");
		const again = toggleTextEditFormat(
			{ ...bold, textEditState: state.textEditState },
			"bold",
		);
		expect(bodyOf(again)).toEqual([
			{ text: "he", fontWeight: "normal" },
			{ text: "llo" },
		]);
	});

	it("reads the slot's own styling, so a bold slot toggles off", () => {
		const state = editingState(
			{ body: { text: "hello", fontWeight: "bold" } },
			"hello",
			{ start: 0, end: 2 },
		);
		// The untouched part keeps no override: it is drawn bold by the slot itself.
		expect(bodyOf(toggleTextEditFormat(state, "bold"))).toEqual([
			{ text: "he", fontWeight: "normal" },
			{ text: "llo" },
		]);
	});

	it("turns the format on for a selection that mixes both", () => {
		const state = editingState(
			{
				body: { text: [{ text: "he", fontStyle: "italic" }, { text: "llo" }] },
			},
			"hello",
			{ start: 0, end: 5 },
		);
		expect(bodyOf(toggleTextEditFormat(state, "italic"))).toEqual([
			{ text: "hello", fontStyle: "italic" },
		]);
	});

	it("keeps the other decoration line when underline is toggled", () => {
		const state = editingState(
			{ body: { text: "hello", textDecoration: "line-through" } },
			"hello",
			{ start: 0, end: 2 },
		);
		expect(bodyOf(toggleTextEditFormat(state, "underline"))).toEqual([
			{ text: "he", textDecoration: "underline line-through" },
			{ text: "llo" },
		]);
	});

	it("styles the edited text, not the last committed one", () => {
		const state = editingState({ body: { text: "hi" } }, "hi there", {
			start: 3,
			end: 8,
		});
		expect(bodyOf(toggleTextEditFormat(state, "bold"))).toEqual([
			{ text: "hi " },
			{ text: "there", fontWeight: "bold" },
		]);
	});

	it("leaves the state untouched when nothing is selected", () => {
		const collapsed = editingState({ body: { text: "hello" } }, "hello", {
			start: 2,
			end: 2,
		});
		expect(toggleTextEditFormat(collapsed, "bold")).toBe(collapsed);
		const unreported = editingState({ body: { text: "hello" } }, "hello");
		expect(toggleTextEditFormat(unreported, "bold")).toBe(unreported);
	});

	it("leaves a slot holding rows untouched", () => {
		const rows = editingState({ body: { text: ["a", "b"] } }, "a\nb", {
			start: 0,
			end: 3,
		});
		expect(toggleTextEditFormat(rows, "bold")).toBe(rows);
	});

	it("leaves the state untouched when there is no open shape editor", () => {
		const idle = makeState();
		expect(toggleTextEditFormat(idle, "bold")).toBe(idle);
	});
});
