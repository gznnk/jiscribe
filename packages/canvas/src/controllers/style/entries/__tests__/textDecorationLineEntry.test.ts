import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import { describe, expect, it } from "vitest";

import type { TextSlots } from "../../../../states/objects/types/TextSlots";
import {
	contextOf,
	rangeOf,
	rectOf,
	slotPickOf,
	textRectOf,
} from "../../__tests__/support/styleFixtures";
import { textDecorationLineEntry } from "../textDecorationLineEntry";

const underline = textDecorationLineEntry("underline");

const readTextSlots = (object: unknown): TextSlots =>
	(object as { text: TextSlots }).text;

/** The context of a walk whose editor has the stretch of `a`'s body slot selected. */
const editing = (start: number, end: number) =>
	contextOf({ textEditRange: rangeOf("a", start, end) });

describe("textDecorationLineEntry with a stretch of text selected", () => {
	describe("apply", () => {
		it("sets the line on each covered run, keeping the strikethrough each one carries", () => {
			const a = textRectOf("a", {
				body: {
					text: [
						{ text: "ab", textDecoration: "underline line-through" },
						{ text: "cd" },
					],
					textDecoration: "underline",
				},
			});
			const updated = underline.apply(a, null, false, editing(0, 4));
			expect(readTextSlots(updated).body).toEqual({
				text: [
					{ text: "ab", textDecoration: "line-through" },
					{ text: "cd", textDecoration: "none" },
				],
				textDecoration: "underline",
			});
		});

		it("starts an unstyled run from the slot's type default", () => {
			const textStyleDefaults = createObjectTextStyleDefaultsRegistry();
			textStyleDefaults.register("rect", {
				byTextSlot: { body: { textDecoration: "line-through" } },
			});
			const a = textRectOf("a", { body: { text: "hello" } });
			const updated = underline.apply(a, null, true, {
				...editing(0, 2),
				textStyleDefaults,
			});
			expect(readTextSlots(updated).body).toEqual({
				text: [
					{ text: "he", textDecoration: "underline line-through" },
					{ text: "llo" },
				],
			});
		});

		it("styles each row's share of a stretch reaching over a row boundary", () => {
			const a = textRectOf("a", {
				body: {
					text: ["ab", [{ text: "cd", textDecoration: "line-through" }]],
				},
			});
			const updated = underline.apply(a, null, true, editing(1, 4));
			expect(readTextSlots(updated).body.text).toEqual([
				[{ text: "a" }, { text: "b", textDecoration: "underline" }],
				[
					{ text: "c", textDecoration: "underline line-through" },
					{ text: "d", textDecoration: "line-through" },
				],
			]);
		});

		it("a stretch already in the asked state → the object itself", () => {
			const a = textRectOf("a", {
				body: { text: "hello", textDecoration: "underline" },
			});
			expect(underline.apply(a, null, true, editing(0, 3))).toBe(a);
		});
	});

	describe("read", () => {
		it("whether each covered run draws the line, from its own value or the slot's", () => {
			const a = textRectOf("a", {
				body: {
					text: [
						{ text: "ab", textDecoration: "underline line-through" },
						{ text: "cd", textDecoration: "line-through" },
						{ text: "ef" },
					],
					textDecoration: "underline",
				},
			});
			expect(underline.read(a, null, editing(0, 6))).toEqual([
				true,
				false,
				true,
			]);
		});
	});
});

describe("textDecorationLineEntry with no stretch selected", () => {
	describe("apply", () => {
		it("sets the line on the slot, keeping its other line", () => {
			const a = textRectOf("a", {
				body: { text: "hello", textDecoration: "line-through" },
			});
			expect(
				readTextSlots(underline.apply(a, null, true, contextOf())).body,
			).toEqual({ text: "hello", textDecoration: "underline line-through" });
		});

		it("sets it on the runs overriding the field too, each keeping its own other line", () => {
			const a = textRectOf("a", {
				body: {
					text: [
						{ text: "he", textDecoration: "underline line-through" },
						{ text: "llo" },
					],
					textDecoration: "underline",
				},
			});
			expect(
				readTextSlots(underline.apply(a, null, false, contextOf())).body,
			).toEqual({
				text: [{ text: "he", textDecoration: "line-through" }, { text: "llo" }],
				textDecoration: "none",
			});
		});

		it("drops a run's override once it draws the same as the slot", () => {
			const a = textRectOf("a", {
				body: {
					text: [{ text: "he", textDecoration: "underline" }, { text: "llo" }],
					textDecoration: "none",
				},
			});
			expect(
				readTextSlots(underline.apply(a, null, false, contextOf())).body,
			).toEqual({ text: "hello", textDecoration: "none" });
		});

		it("goes through a row-partitioned slot row by row", () => {
			const a = textRectOf("a", {
				body: {
					text: ["id", [{ text: "email", textDecoration: "line-through" }]],
				},
			});
			expect(
				readTextSlots(underline.apply(a, null, true, contextOf())).body,
			).toEqual({
				text: [
					"id",
					[{ text: "email", textDecoration: "underline line-through" }],
				],
				textDecoration: "underline",
			});
		});

		it("leaves a slot already in the asked state as it is, unset included", () => {
			const a = textRectOf("a", { body: { text: "hello" } });
			expect(underline.apply(a, null, false, contextOf())).toBe(a);
		});

		it("writes the picked slot alone", () => {
			const a = textRectOf("a", {
				name: { text: "User" },
				rows: { text: ["id"] },
			});
			expect(
				readTextSlots(
					underline.apply(a, slotPickOf("rows"), true, contextOf()),
				),
			).toEqual({
				name: { text: "User" },
				rows: { text: ["id"], textDecoration: "underline" },
			});
		});

		it("an object holding no text → null", () => {
			expect(underline.apply(rectOf("a"), null, true, contextOf())).toBeNull();
		});
	});

	describe("read", () => {
		it("every run's drawn value, since the write keeps the runs", () => {
			const a = textRectOf("a", {
				body: {
					text: [
						{ text: "he", textDecoration: "line-through" },
						{ text: "llo" },
					],
					textDecoration: "underline",
				},
			});
			expect(underline.read(a, null, contextOf())).toEqual([false, true]);
		});

		it("one answer per plain slot or emptied row list, from the slot's own value", () => {
			const a = textRectOf("a", {
				name: { text: "User", textDecoration: "underline" },
				rows: { text: [] },
			});
			expect(underline.read(a, null, contextOf())).toEqual([true, false]);
		});

		it("the strikethrough entry reads its own line", () => {
			const a = textRectOf("a", {
				body: { text: "hello", textDecoration: "underline line-through" },
			});
			expect(
				textDecorationLineEntry("line-through").read(a, null, contextOf()),
			).toEqual([true]);
		});
	});
});
