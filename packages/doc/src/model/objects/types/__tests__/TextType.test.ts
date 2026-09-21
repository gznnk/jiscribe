import { describe, expect, it } from "vitest";

import { TEXT_SLOT_STYLE_KEYS } from "../TextSlot";
import { isSingleBodyText, textStyleKeysOf } from "../TextType";

describe("isSingleBodyText", () => {
	it("is true for the two root-form types and false for the rest", () => {
		expect(isSingleBodyText("body")).toBe(true);
		expect(isSingleBodyText("source")).toBe(true);
		expect(isSingleBodyText("slots")).toBe(false);
		expect(isSingleBodyText(undefined)).toBe(false);
	});
});

describe("textStyleKeysOf", () => {
	it("gives a type holding no text nothing to be styled with", () => {
		expect(textStyleKeysOf(undefined)).toEqual([]);
	});

	it("gives a body and a slots type the whole slot set, in its own order", () => {
		expect(textStyleKeysOf("body")).toEqual([...TEXT_SLOT_STYLE_KEYS]);
		expect(textStyleKeysOf("slots")).toEqual([...TEXT_SLOT_STYLE_KEYS]);
	});

	it("takes the emphasis half off a source type, keeping the order of the rest", () => {
		expect(textStyleKeysOf("source")).toEqual([
			"textAlign",
			"verticalAlign",
			"fontColor",
			"fontSize",
			"fontFamily",
		]);
	});

	it("answers with a fresh array, so a caller may keep what it is handed", () => {
		expect(textStyleKeysOf("body")).not.toBe(textStyleKeysOf("body"));
	});
});
