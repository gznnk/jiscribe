import type * as NodeFs from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
	DRAWING_GUIDE_NAMES,
	DrawingGuideError,
	isDrawingGuideName,
	readDrawingGuide,
} from "../readDrawingGuide";

/** What the mocked readFileSync answers; null reads the real file. */
let stubbedContents: string | Error | null = null;

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof NodeFs>();
	return {
		...actual,
		readFileSync: ((...args: Parameters<typeof actual.readFileSync>) => {
			if (stubbedContents instanceof Error) {
				throw stubbedContents;
			}
			return stubbedContents ?? actual.readFileSync(...args);
		}) as typeof actual.readFileSync,
	};
});

afterEach(() => {
	stubbedContents = null;
});

describe("readDrawingGuide", () => {
	it("reads both guides, each opening with its version stamp", () => {
		expect(DRAWING_GUIDE_NAMES).toEqual(["drawing", "json-format"]);
		for (const guide of DRAWING_GUIDE_NAMES) {
			expect(readDrawingGuide(guide)).toMatch(/^<!-- jiscribe guide /);
		}
	});

	it("throws, naming the installation as incomplete, for a guide it cannot read", () => {
		stubbedContents = new Error("ENOENT: no such file");
		expect(() => readDrawingGuide("drawing")).toThrow(DrawingGuideError);
		expect(() => readDrawingGuide("drawing")).toThrow(
			/^the "drawing" guide could not be read from @jiscribe\/doc-schema\/canvas-prompt, so this installation is incomplete: ENOENT: no such file$/,
		);
	});

	it("throws for a guide holding only whitespace", () => {
		stubbedContents = " \n\t\n";
		expect(() => readDrawingGuide("json-format")).toThrow(
			'the "json-format" guide at @jiscribe/doc-schema/authoring-json is empty, so this installation is incomplete',
		);
	});
});

describe("isDrawingGuideName", () => {
	it("accepts the guide names only, case included", () => {
		expect(isDrawingGuideName("drawing")).toBe(true);
		expect(isDrawingGuideName("Drawing")).toBe(false);
		expect(isDrawingGuideName("toString")).toBe(false);
	});
});
