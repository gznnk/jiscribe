import { describe, expect, it } from "vitest";

import { isCanvasFileName } from "../canvasFileExtensions";

describe("isCanvasFileName", () => {
	it("accepts the single-segment extensions", () => {
		expect(isCanvasFileName("diagram.jis")).toBe(true);
		expect(isCanvasFileName("diagram.jiscribe")).toBe(true);
	});

	it("accepts the legacy compound extensions", () => {
		expect(isCanvasFileName("diagram.jis.json")).toBe(true);
		expect(isCanvasFileName("diagram.jiscribe.json")).toBe(true);
	});

	it("rejects unrelated files", () => {
		expect(isCanvasFileName("package.json")).toBe(false);
		expect(isCanvasFileName("diagram.jis.png")).toBe(false);
		expect(isCanvasFileName("jis")).toBe(false);
	});
});
