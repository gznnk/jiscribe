import { describe, it, expect } from "vitest";

import { validateTextStyleFields } from "../validateTextFields";

// ─── validateTextStyleFields ──────────────────────────────────────

describe("validateTextStyleFields", () => {
	it("no errors when the text fields are missing", () => {
		expect(validateTextStyleFields({}, "root")).toEqual([]);
	});

	it("valid text fields have no errors", () => {
		const o = {
			text: "hello",
			textAlign: "center",
			verticalAlign: "middle",
			fontColor: "#000",
			fontSize: 16,
			fontFamily: "Noto Sans JP",
			fontWeight: "normal",
			fontStyle: "italic",
			textDecoration: "underline line-through",
		};
		expect(validateTextStyleFields(o, "root")).toEqual([]);
	});

	it("errors for an invalid textAlign value", () => {
		const errors = validateTextStyleFields({ textAlign: "justify" }, "root");
		expect(errors[0].path).toBe("root.textAlign");
	});

	it("accepts a text written as the runs it is styled in", () => {
		expect(
			validateTextStyleFields(
				{ text: [{ text: "he" }, { text: "llo", fontWeight: "bold" }] },
				"root",
			),
		).toEqual([]);
	});

	it("errors on a malformed run, pointing at the run", () => {
		expect(
			validateTextStyleFields({ text: [{ text: 1 }] }, "root")[0].path,
		).toBe("root.text[0].text");
		expect(
			validateTextStyleFields({ text: [{ text: "a", fontSize: 0 }] }, "root")[0]
				.path,
		).toBe("root.text[0].fontSize");
		expect(validateTextStyleFields({ text: ["a"] }, "root")[0].path).toBe(
			"root.text[0]",
		);
		expect(validateTextStyleFields({ text: 1 }, "root")[0].path).toBe(
			"root.text",
		);
	});

	it("textAlign: left / right has no errors", () => {
		expect(validateTextStyleFields({ textAlign: "left" }, "root")).toEqual([]);
		expect(validateTextStyleFields({ textAlign: "right" }, "root")).toEqual([]);
	});

	it("errors for an invalid verticalAlign value", () => {
		const errors = validateTextStyleFields(
			{ verticalAlign: "baseline" },
			"root",
		);
		expect(errors[0].path).toBe("root.verticalAlign");
	});

	it("verticalAlign: top / bottom has no errors", () => {
		expect(validateTextStyleFields({ verticalAlign: "top" }, "root")).toEqual(
			[],
		);
		expect(
			validateTextStyleFields({ verticalAlign: "bottom" }, "root"),
		).toEqual([]);
	});

	it("ignores unknown keys, including the removed textType", () => {
		expect(
			validateTextStyleFields({ textType: "markdown", unknownKey: 1 }, "root"),
		).toEqual([]);
	});

	it("errors when fontSize is not a number", () => {
		const errors = validateTextStyleFields({ fontSize: "16px" }, "root");
		expect(errors[0].path).toBe("root.fontSize");
	});

	it("errors when fontColor is not a string", () => {
		const errors = validateTextStyleFields({ fontColor: 0 }, "root");
		expect(errors[0].path).toBe("root.fontColor");
	});

	it("errors when fontColor contains a CSS breakout", () => {
		const errors = validateTextStyleFields(
			{ fontColor: "#000; } body {" },
			"root",
		);
		expect(errors[0].path).toBe("root.fontColor");
	});

	it("errors when fontFamily contains a CSS breakout", () => {
		const errors = validateTextStyleFields(
			{ fontFamily: "Arial; } body { display: none" },
			"root",
		);
		expect(errors[0].path).toBe("root.fontFamily");
	});

	it("errors when fontWeight contains a CSS breakout", () => {
		const errors = validateTextStyleFields(
			{ fontWeight: "bold } html {" },
			"root",
		);
		expect(errors[0].path).toBe("root.fontWeight");
	});

	it("errors when fontStyle contains a CSS breakout", () => {
		const errors = validateTextStyleFields(
			{ fontStyle: "italic } html {" },
			"root",
		);
		expect(errors[0].path).toBe("root.fontStyle");
	});

	it("errors when textDecoration contains a CSS breakout", () => {
		const errors = validateTextStyleFields(
			{ textDecoration: "underline } html {" },
			"root",
		);
		expect(errors[0].path).toBe("root.textDecoration");
	});
});
// ─── Lower bounds for optional number fields ─────────────────────

describe("lower bounds for numeric text fields", () => {
	it("fontSize below 1 errors (>= 1), unspecified is allowed", () => {
		expect(
			validateTextStyleFields({ fontSize: 0 }, "root")[0].message,
		).toContain(">= 1");
		expect(validateTextStyleFields({}, "root")).toEqual([]);
		expect(validateTextStyleFields({ fontSize: 1 }, "root")).toEqual([]);
	});
});
