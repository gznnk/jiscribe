import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import {
	contextOf,
	rangeOf,
	rectOf,
	textRectOf,
} from "./support/styleFixtures";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import { isBoldFontWeight } from "../../utils/isBoldFontWeight";
import { toggleTextDecorationToken } from "../../utils/toggleTextDecorationToken";
import { defaultSlotsOf } from "../entries/slotEntry";
import { toggleRunOrSlot } from "../entries/toggleRunOrSlot";

/** The three entries as textStyleTable builds them, so the toggles under test are the shipped ones. */
const bold = toggleRunOrSlot<ObjectState>("fontWeight", {
	slotsOf: defaultSlotsOf,
	toggle: (current) => (isBoldFontWeight(current) ? "normal" : "bold"),
});
const italic = toggleRunOrSlot<ObjectState>("fontStyle", {
	slotsOf: defaultSlotsOf,
	toggle: (current) => (current === "italic" ? "normal" : "italic"),
});
const underline = toggleRunOrSlot<ObjectState>("textDecoration", {
	slotsOf: defaultSlotsOf,
	toggle: (current) => toggleTextDecorationToken(current, "underline"),
});

const slotsOf = (object: unknown): TextSlots =>
	(object as { text: TextSlots }).text;

const bodyOf = (object: unknown) => slotsOf(object).body.text;

/** The context of a walk whose editor has that stretch of `a`'s body slot selected. */
const editing = (start: number, end: number, objectId = "a") =>
	contextOf({ textEditRange: rangeOf(objectId, start, end) });

describe("toggleRunOrSlot", () => {
	it("styles the selected characters alone", () => {
		const a = textRectOf("a", { body: { text: "hello" } });
		expect(bodyOf(bold.apply(a, null, undefined, editing(0, 2)))).toEqual([
			{ text: "he", fontWeight: "bold" },
			{ text: "llo" },
		]);
	});

	it("a second press turns the format back off", () => {
		const a = textRectOf("a", { body: { text: "hello" } });
		const bolded = bold.apply(a, null, undefined, editing(0, 2)) as ObjectState;
		expect(bodyOf(bold.apply(bolded, null, undefined, editing(0, 2)))).toEqual([
			{ text: "he", fontWeight: "normal" },
			{ text: "llo" },
		]);
	});

	it("reads the slot's own styling, so a bold slot toggles off", () => {
		// The untouched part keeps no override: it is drawn bold by the slot itself.
		const a = textRectOf("a", { body: { text: "hello", fontWeight: "bold" } });
		expect(bodyOf(bold.apply(a, null, undefined, editing(0, 2)))).toEqual([
			{ text: "he", fontWeight: "normal" },
			{ text: "llo" },
		]);
	});

	it("turns the format off when the type's default is what the text is drawn with", () => {
		const boldByDefault = createObjectTextStyleDefaultsRegistry();
		boldByDefault.register("rect", {
			bySlot: { [BODY_TEXT_SLOT_ID]: { fontWeight: "bold" } },
		});
		const a = textRectOf("a", { body: { text: "hello" } });
		const ctx = {
			...editing(0, 2),
			textStyleDefaults: boldByDefault,
		};
		expect(bodyOf(bold.apply(a, null, undefined, ctx))).toEqual([
			{ text: "he", fontWeight: "normal" },
			{ text: "llo" },
		]);
	});

	it("a stretch mixing both reads as unset and turns the format on", () => {
		const a = textRectOf("a", {
			body: { text: [{ text: "he", fontStyle: "italic" }, { text: "llo" }] },
		});
		expect(bodyOf(italic.apply(a, null, undefined, editing(0, 5)))).toEqual([
			{ text: "hello", fontStyle: "italic" },
		]);
	});

	it("keeps the other decoration line", () => {
		const a = textRectOf("a", {
			body: { text: "hello", textDecoration: "line-through" },
		});
		expect(bodyOf(underline.apply(a, null, undefined, editing(0, 2)))).toEqual([
			{ text: "he", textDecoration: "underline line-through" },
			{ text: "llo" },
		]);
	});

	it("styles each row's share of a stretch reaching over a row boundary", () => {
		const a = textRectOf("a", { body: { text: ["ab", "cd"] } });
		// The rows read as "ab\ncd", which is what the offsets count in.
		expect(bodyOf(bold.apply(a, null, undefined, editing(1, 4)))).toEqual([
			[{ text: "a" }, { text: "b", fontWeight: "bold" }],
			[{ text: "c", fontWeight: "bold" }, { text: "d" }],
		]);
	});

	it("no stretch selected → null, a keystroke being no shape-wide write", () => {
		const a = textRectOf("a", { body: { text: "hello" } });
		expect(bold.apply(a, null, undefined, contextOf())).toBeNull();
	});

	it("a stretch of another object → null", () => {
		const a = textRectOf("a", { body: { text: "hello" } });
		expect(bold.apply(a, null, undefined, editing(0, 2, "other"))).toBeNull();
	});

	it("a stretch naming a slot the object does not hold → null", () => {
		const a = textRectOf("a", { body: { text: "hello" } });
		expect(
			bold.apply(
				a,
				null,
				undefined,
				contextOf({ textEditRange: rangeOf("a", 0, 2, "missing") }),
			),
		).toBeNull();
	});

	it("an object holding no text → null", () => {
		expect(bold.apply(rectOf("a"), null, undefined, editing(0, 2))).toBeNull();
	});

	describe("read", () => {
		it("reports the field the toggle flips, as runOrSlot does", () => {
			const a = textRectOf("a", {
				body: { text: [{ text: "he", fontWeight: "bold" }, { text: "llo" }] },
			});
			expect(bold.read(a, null, editing(0, 2))).toEqual(["bold"]);
		});

		it("with no stretch selected → one value per slot", () => {
			const a = textRectOf("a", {
				name: { text: "User", fontWeight: "bold" },
				rows: { text: ["id"] },
			});
			expect(bold.read(a, null, contextOf())).toEqual(["bold", undefined]);
		});
	});
});
