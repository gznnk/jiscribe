import { describe, expect, it } from "vitest";

import {
	isTextFormatOn,
	textFormatStyleIntentKind,
	toggleTextFormatIntent,
} from "../TextFormat";

describe("textFormatStyleIntentKind", () => {
	it("reads each line through an intent of its own, not the shared field", () => {
		expect(textFormatStyleIntentKind("bold")).toBe("fontWeight");
		expect(textFormatStyleIntentKind("italic")).toBe("fontStyle");
		expect(textFormatStyleIntentKind("underline")).toBe("underline");
		expect(textFormatStyleIntentKind("strikethrough")).toBe("strikethrough");
	});
});

describe("isTextFormatOn", () => {
	it("a line every place carries → on", () => {
		expect(isTextFormatOn("underline", { kind: "single", value: true })).toBe(
			true,
		);
	});

	it("a line only some places carry → off", () => {
		expect(
			isTextFormatOn("strikethrough", { kind: "mixed", values: [true, false] }),
		).toBe(false);
	});

	it("nothing taking the format → off", () => {
		expect(isTextFormatOn("underline", { kind: "none" })).toBe(false);
		expect(isTextFormatOn("bold", { kind: "none" })).toBe(false);
	});

	it("bold and italic read the value the selection agrees on, a mix reading off", () => {
		expect(isTextFormatOn("bold", { kind: "single", value: "700" })).toBe(true);
		expect(isTextFormatOn("bold", { kind: "single", value: undefined })).toBe(
			false,
		);
		expect(
			isTextFormatOn("bold", { kind: "mixed", values: ["bold", "normal"] }),
		).toBe(false);
		expect(isTextFormatOn("italic", { kind: "single", value: "italic" })).toBe(
			true,
		);
	});
});

describe("toggleTextFormatIntent", () => {
	it("takes a line off a selection that all carries it", () => {
		expect(
			toggleTextFormatIntent("underline", { kind: "single", value: true }),
		).toEqual({ kind: "underline", on: false });
	});

	it("puts a line on where only part of the selection carries it", () => {
		expect(
			toggleTextFormatIntent("strikethrough", {
				kind: "mixed",
				values: [false, true],
			}),
		).toEqual({ kind: "strikethrough", on: true });
	});

	it("lands bold and italic on one value", () => {
		expect(
			toggleTextFormatIntent("bold", {
				kind: "mixed",
				values: ["bold", "normal"],
			}),
		).toEqual({ kind: "fontWeight", weight: "bold" });
		expect(
			toggleTextFormatIntent("italic", { kind: "single", value: "italic" }),
		).toEqual({ kind: "fontStyle", style: "normal" });
	});
});
