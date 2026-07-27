import { describe, expect, it } from "vitest";

import { isTextSlot, TEXT_SLOT_STYLE_KEYS } from "../TextSlot";

describe("isTextSlot", () => {
	it("accepts both content kinds, with or without styling", () => {
		expect(isTextSlot({ text: "" })).toBe(true);
		expect(isTextSlot({ text: "hello" })).toBe(true);
		expect(isTextSlot({ text: [] })).toBe(true);
		expect(isTextSlot({ text: ["id", "name"] })).toBe(true);
		expect(
			isTextSlot({
				text: "hello",
				textAlign: "center",
				verticalAlign: "top",
				fontColor: "auto",
				fontSize: 14,
				fontFamily: "serif",
				fontWeight: "bold",
			}),
		).toBe(true);
	});

	it("rejects a missing or wrongly typed content", () => {
		expect(isTextSlot(undefined)).toBe(false);
		expect(isTextSlot("hello")).toBe(false);
		expect(isTextSlot(["hello"])).toBe(false);
		expect(isTextSlot({})).toBe(false);
		expect(isTextSlot({ text: 1 })).toBe(false);
		expect(isTextSlot({ text: ["id", 2] })).toBe(false);
	});

	it("rejects a style field of the wrong type or outside its enum", () => {
		expect(isTextSlot({ text: "x", textAlign: "justify" })).toBe(false);
		expect(isTextSlot({ text: "x", verticalAlign: "center" })).toBe(false);
		expect(isTextSlot({ text: "x", fontSize: "14" })).toBe(false);
		expect(isTextSlot({ text: "x", fontColor: 0 })).toBe(false);
		expect(isTextSlot({ text: "x", fontFamily: 0 })).toBe(false);
		expect(isTextSlot({ text: "x", fontWeight: 700 })).toBe(false);
	});

	it("accepts an explicitly undefined style field, an absent one being valid", () => {
		expect(isTextSlot({ text: "x", fontSize: undefined })).toBe(true);
	});
});

describe("TEXT_SLOT_STYLE_KEYS", () => {
	it("names the styling fields and not the content", () => {
		expect(TEXT_SLOT_STYLE_KEYS).toEqual([
			"textAlign",
			"verticalAlign",
			"fontColor",
			"fontSize",
			"fontFamily",
			"fontWeight",
		]);
	});
});
