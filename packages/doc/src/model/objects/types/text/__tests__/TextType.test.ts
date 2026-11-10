import { describe, expect, it } from "vitest";

import { TEXT_SLOT_STYLE_KEYS } from "../TextSlot";
import {
	acceptsTextEmphasisStyle,
	hasLabelFill,
	isCaptionText,
	isSingleBodyText,
	textStyleKeysOf,
} from "../TextType";

describe("isSingleBodyText", () => {
	it("is true for the root-form types and false for the rest", () => {
		expect(isSingleBodyText("body")).toBe(true);
		expect(isSingleBodyText("source")).toBe(true);
		expect(isSingleBodyText("label")).toBe(true);
		expect(isSingleBodyText("innerLabel")).toBe(true);
		expect(isSingleBodyText("slots")).toBe(false);
		expect(isSingleBodyText(undefined)).toBe(false);
	});
});

describe("isCaptionText", () => {
	it("is true for the two caption types sized from their own text", () => {
		expect(isCaptionText("label")).toBe(true);
		expect(isCaptionText("innerLabel")).toBe(true);
		expect(isCaptionText("body")).toBe(false);
		expect(isCaptionText("source")).toBe(false);
		expect(isCaptionText("slots")).toBe(false);
		expect(isCaptionText(undefined)).toBe(false);
	});
});

describe("hasLabelFill", () => {
	it("is true for a label caption alone, an innerLabel one sitting on the shape's own fill", () => {
		expect(hasLabelFill("label")).toBe(true);
		expect(hasLabelFill("innerLabel")).toBe(false);
		expect(hasLabelFill("body")).toBe(false);
		expect(hasLabelFill("source")).toBe(false);
		expect(hasLabelFill("slots")).toBe(false);
		expect(hasLabelFill(undefined)).toBe(false);
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

	it("takes the vertical placement off a label type, keeping the order of the rest", () => {
		expect(textStyleKeysOf("label")).toEqual(
			TEXT_SLOT_STYLE_KEYS.filter((key) => key !== "verticalAlign"),
		);
		expect(textStyleKeysOf("label")).toContain("fontWeight");
		expect(textStyleKeysOf("innerLabel")).toEqual(textStyleKeysOf("label"));
	});

	it("answers with a fresh array, so a caller may keep what it is handed", () => {
		expect(textStyleKeysOf("body")).not.toBe(textStyleKeysOf("body"));
	});
});

describe("acceptsTextEmphasisStyle", () => {
	it("is true for every type but the one whose syntax sets the emphasis itself", () => {
		expect(acceptsTextEmphasisStyle("body")).toBe(true);
		expect(acceptsTextEmphasisStyle("slots")).toBe(true);
		expect(acceptsTextEmphasisStyle("label")).toBe(true);
		expect(acceptsTextEmphasisStyle("innerLabel")).toBe(true);
		expect(acceptsTextEmphasisStyle("source")).toBe(false);
		expect(acceptsTextEmphasisStyle(undefined)).toBe(false);
	});
});
