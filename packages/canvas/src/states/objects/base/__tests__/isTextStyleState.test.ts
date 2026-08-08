import { describe, it, expect } from "vitest";

import { isTextStyleState } from "../TextStyleState";

// NOTE: The styling inside a slot is checked by isTextSlot (its own suite); this
// one covers the shape of `text` itself, which is all TextStyleState declares.
describe("isTextStyleState", () => {
	it("accepts an object with no text at all", () => {
		expect(isTextStyleState({})).toBe(true);
		expect(isTextStyleState({ text: undefined })).toBe(true);
	});

	it("accepts styled slots of either content kind", () => {
		expect(
			isTextStyleState({
				text: {
					body: {
						text: "hello",
						// Rejecting auto would prevent TextEditorLayer from rendering and
						// break text editing (issue #38).
						fontColor: "auto",
						textAlign: "center",
						verticalAlign: "middle",
						fontSize: 16,
					},
				},
			}),
		).toBe(true);
		expect(
			isTextStyleState({
				text: { name: { text: "User" }, rows: { text: ["id"] } },
			}),
		).toBe(true);
	});

	it("rejects a slot whose styling is malformed", () => {
		expect(
			isTextStyleState({ text: { body: { text: "x", textAlign: "justify" } } }),
		).toBe(false);
	});

	it("rejects a bare content: a slot is always an object", () => {
		expect(isTextStyleState({ text: "hello" })).toBe(false);
		expect(isTextStyleState({ text: { body: "hello" } })).toBe(false);
	});
});
