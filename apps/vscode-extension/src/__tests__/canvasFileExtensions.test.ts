import { describe, expect, it } from "vitest";

import {
	isCanvasFileName,
	stripCanvasFileExtension,
} from "../canvasFileExtensions";

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

describe("stripCanvasFileExtension", () => {
	it("strips the whole compound extension, not just its tail", () => {
		expect(stripCanvasFileExtension("diagram.jis.json")).toBe("diagram");
		expect(stripCanvasFileExtension("diagram.jiscribe.json")).toBe("diagram");
	});

	it("strips the single-segment extensions", () => {
		expect(stripCanvasFileExtension("diagram.jis")).toBe("diagram");
		expect(stripCanvasFileExtension("diagram.jiscribe")).toBe("diagram");
	});

	it("keeps dots that belong to the stem", () => {
		expect(stripCanvasFileExtension("report.v2.jis")).toBe("report.v2");
	});

	it("returns the name unchanged when it has no canvas extension", () => {
		expect(stripCanvasFileExtension("package.json")).toBe("package.json");
	});
});
