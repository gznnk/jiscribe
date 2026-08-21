import type { RichText } from "@jiscribe/doc/model/objects/types/RichText";
import { richTextToPlain } from "@jiscribe/doc/model/objects/types/RichText";
import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectTextStyleDefaultsRegistry";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";
import { describe, expect, it } from "vitest";

import type { TextSlots } from "../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../CanvasTypes";
import { toggleTextEditFormat } from "../toggleTextEditFormat";

/** The edited type registers no defaults unless a case says otherwise. */
const textStyleDefaults = createObjectTextStyleDefaultsRegistry();

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
		expect(
			bodyOf(toggleTextEditFormat(state, "bold", textStyleDefaults)),
		).toEqual([{ text: "he", fontWeight: "bold" }, { text: "llo" }]);
	});

	it("turns the format back off on a second press", () => {
		const state = editingState({ body: { text: "hello" } }, "hello", {
			start: 0,
			end: 2,
		});
		const bold = toggleTextEditFormat(state, "bold", textStyleDefaults);
		const again = toggleTextEditFormat(bold, "bold", textStyleDefaults);
		expect(bodyOf(again)).toEqual([
			{ text: "he", fontWeight: "normal" },
			{ text: "llo" },
		]);
	});

	it("lands the styling on the draft as well, so the editor is handed it back", () => {
		const state = editingState({ body: { text: "hello" } }, "hello", {
			start: 0,
			end: 2,
		});
		const bold = toggleTextEditFormat(state, "bold", textStyleDefaults);
		expect(bold.textEditState).toMatchObject({
			text: [{ text: "he", fontWeight: "bold" }, { text: "llo" }],
		});
	});

	it("reads the slot's own styling, so a bold slot toggles off", () => {
		const state = editingState(
			{ body: { text: "hello", fontWeight: "bold" } },
			"hello",
			{ start: 0, end: 2 },
		);
		// The untouched part keeps no override: it is drawn bold by the slot itself.
		expect(
			bodyOf(toggleTextEditFormat(state, "bold", textStyleDefaults)),
		).toEqual([{ text: "he", fontWeight: "normal" }, { text: "llo" }]);
	});

	it("turns the format on for a selection that mixes both", () => {
		const state = editingState(
			{
				body: { text: [{ text: "he", fontStyle: "italic" }, { text: "llo" }] },
			},
			"hello",
			{ start: 0, end: 5 },
		);
		expect(
			bodyOf(toggleTextEditFormat(state, "italic", textStyleDefaults)),
		).toEqual([{ text: "hello", fontStyle: "italic" }]);
	});

	it("keeps the other decoration line when underline is toggled", () => {
		const state = editingState(
			{ body: { text: "hello", textDecoration: "line-through" } },
			"hello",
			{ start: 0, end: 2 },
		);
		expect(
			bodyOf(toggleTextEditFormat(state, "underline", textStyleDefaults)),
		).toEqual([
			{ text: "he", textDecoration: "underline line-through" },
			{ text: "llo" },
		]);
	});

	it("styles the edited text, not the last committed one", () => {
		const state = editingState({ body: { text: "hi" } }, "hi there", {
			start: 3,
			end: 8,
		});
		expect(
			bodyOf(toggleTextEditFormat(state, "bold", textStyleDefaults)),
		).toEqual([{ text: "hi " }, { text: "there", fontWeight: "bold" }]);
	});

	it("leaves the state untouched when nothing is selected", () => {
		const collapsed = editingState({ body: { text: "hello" } }, "hello", {
			start: 2,
			end: 2,
		});
		expect(toggleTextEditFormat(collapsed, "bold", textStyleDefaults)).toBe(
			collapsed,
		);
		const unreported = editingState({ body: { text: "hello" } }, "hello");
		expect(toggleTextEditFormat(unreported, "bold", textStyleDefaults)).toBe(
			unreported,
		);
	});

	it("leaves the state untouched when there is no open shape editor", () => {
		const idle = makeState();
		expect(toggleTextEditFormat(idle, "bold", textStyleDefaults)).toBe(idle);
	});
});

/**
 * A row-partitioned slot (a record's compartment) is edited as its rows joined by
 * "\n", so the offsets address that joined text and the styled result has to land
 * back in the rows it came from.
 */
describe("toggleTextEditFormat on a slot holding rows", () => {
	const rowsOf = (state: CanvasControllerState): RichText[] =>
		(state.objects.r1 as unknown as { text: TextSlots }).text.body
			.text as RichText[];

	/** Two rows, edited as "ab\ncd", with the given offsets into that joined text. */
	const editingRows = (start: number, end: number): CanvasControllerState =>
		editingState({ body: { text: ["ab", "cd"] } }, "ab\ncd", { start, end });

	it("styles the selected characters of one row, leaving the other row alone", () => {
		expect(
			rowsOf(
				toggleTextEditFormat(editingRows(0, 1), "bold", textStyleDefaults),
			),
		).toEqual([[{ text: "a", fontWeight: "bold" }, { text: "b" }], "cd"]);
	});

	it("styles each row's share of a selection spanning the row boundary", () => {
		// Offsets 1..4 cover "b", the "\n" between the rows, and "c".
		expect(
			rowsOf(
				toggleTextEditFormat(editingRows(1, 4), "bold", textStyleDefaults),
			),
		).toEqual([
			[{ text: "a" }, { text: "b", fontWeight: "bold" }],
			[{ text: "c", fontWeight: "bold" }, { text: "d" }],
		]);
	});

	it("keeps the characters of the rows as they were when the selection spans them", () => {
		const rows = rowsOf(
			toggleTextEditFormat(editingRows(1, 4), "bold", textStyleDefaults),
		);
		// The styled "\n" is dropped by the split, so the round trip adds no row and
		// loses no character.
		expect(rows.map(richTextToPlain).join("\n")).toBe("ab\ncd");
	});

	it("reads the styling back off the draft, so a second press turns it off", () => {
		const state = editingRows(0, 1);
		const bold = toggleTextEditFormat(state, "bold", textStyleDefaults);
		const again = toggleTextEditFormat(bold, "bold", textStyleDefaults);
		expect(rowsOf(again)).toEqual([
			[{ text: "a", fontWeight: "normal" }, { text: "b" }],
			"cd",
		]);
	});

	it("styles the edited rows, not the last committed ones", () => {
		const state = editingState(
			{ body: { text: ["ab"] } },
			"ab\ncd",
			// The second row exists only in the draft.
			{ start: 3, end: 5 },
		);
		expect(
			rowsOf(toggleTextEditFormat(state, "italic", textStyleDefaults)),
		).toEqual(["ab", [{ text: "cd", fontStyle: "italic" }]]);
	});
});

describe("toggleTextEditFormat against the type's own defaults", () => {
	/** A registry standing in for a type whose bodies are bold unless said otherwise. */
	const boldByDefault = createObjectTextStyleDefaultsRegistry();
	boldByDefault.register("rect", {
		[BODY_TEXT_SLOT_ID]: { fontWeight: "bold" },
	});

	const selected = (): CanvasControllerState =>
		editingState({ body: { text: "hello" } }, "hello", { start: 0, end: 2 });

	it("turns the format on for a slot whose type declares nothing about it", () => {
		expect(
			bodyOf(toggleTextEditFormat(selected(), "bold", textStyleDefaults)),
		).toEqual([{ text: "he", fontWeight: "bold" }, { text: "llo" }]);
	});

	it("turns the format off when the type's default is what the text is drawn with", () => {
		// Nothing in the slot or the runs says "bold" — only the type does, and the
		// toggle has to read the same value the overlay draws.
		expect(
			bodyOf(toggleTextEditFormat(selected(), "bold", boldByDefault)),
		).toEqual([{ text: "he", fontWeight: "normal" }, { text: "llo" }]);
	});
});
