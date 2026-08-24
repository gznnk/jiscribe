import { describe, expect, it } from "vitest";

import { isValidTextState } from "../validateTextState";

const validText = {
	id: "t1",
	type: "text",
	cx: 0,
	cy: 0,
	width: 40,
	height: 28,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	text: { body: { text: "label", fontSize: 16 } },
};

describe("isValidTextState", () => {
	it("accepts a valid Text state", () => {
		expect(isValidTextState(validText)).toBe(true);
	});

	it("rejects a mismatched type or an empty id", () => {
		expect(isValidTextState({ ...validText, type: "rect" })).toBe(false);
		expect(isValidTextState({ ...validText, id: "" })).toBe(false);
	});

	it("demands the frame the state carries even though the doc has none", () => {
		expect(isValidTextState({ ...validText, width: undefined })).toBe(false);
		expect(isValidTextState({ ...validText, height: -1 })).toBe(false);
	});

	it("demands the transform group", () => {
		expect(isValidTextState({ ...validText, rotation: undefined })).toBe(false);
	});

	it("demands the body slot, and rejects an unsafe style in it", () => {
		expect(isValidTextState({ ...validText, text: {} })).toBe(false);
		expect(
			isValidTextState({
				...validText,
				text: { body: { text: "x", fontFamily: "a; url(javascript:1)" } },
			}),
		).toBe(false);
	});

	it("accepts both layouts and an absent one, and rejects anything else", () => {
		// The mapper writes textLayout back to the document unchecked, so a value
		// the doc validator refuses must be stopped here at the clipboard boundary
		// — or a paste saves a file that cannot be reopened.
		expect(isValidTextState({ ...validText, textLayout: "label" })).toBe(true);
		expect(isValidTextState({ ...validText, textLayout: "block" })).toBe(true);
		expect(isValidTextState({ ...validText, textLayout: "bogus" })).toBe(false);
		expect(isValidTextState({ ...validText, textLayout: 1 })).toBe(false);
	});

	it("rejects a non-object", () => {
		expect(isValidTextState(null)).toBe(false);
		expect(isValidTextState("text")).toBe(false);
	});
});
