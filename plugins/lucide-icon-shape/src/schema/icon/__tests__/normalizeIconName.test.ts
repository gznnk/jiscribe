import { describe, expect, it } from "vitest";

import { normalizeIconName } from "../normalizeIconName";

describe("normalizeIconName", () => {
	it("leaves a name that is already kebab-case alone", () => {
		expect(normalizeIconName("file-text")).toBe("file-text");
	});

	it("rewrites the casings a component name is written in", () => {
		expect(normalizeIconName("fileText")).toBe("file-text");
		expect(normalizeIconName("FileText")).toBe("file-text");
		expect(normalizeIconName("AArrowDown")).toBe("a-arrow-down");
	});

	it("rewrites underscores and spaces as separators", () => {
		expect(normalizeIconName("file_text")).toBe("file-text");
		expect(normalizeIconName("  File Text  ")).toBe("file-text");
	});

	it("drops a trailing -icon, which no name carries", () => {
		expect(normalizeIconName("file-text-icon")).toBe("file-text");
	});

	it("keeps a digit beside a letter, where a name means it", () => {
		expect(normalizeIconName("grid-2x2")).toBe("grid-2x2");
	});

	it("collapses repeated separators instead of leaving empty words", () => {
		expect(normalizeIconName("--file__text--")).toBe("file-text");
	});

	it("returns an empty string when nothing survives", () => {
		expect(normalizeIconName("   ")).toBe("");
		expect(normalizeIconName("-_-")).toBe("");
	});
});
