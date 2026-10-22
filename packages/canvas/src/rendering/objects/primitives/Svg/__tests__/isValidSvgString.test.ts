// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { isValidSvgString } from "../isValidSvgString";

describe("isValidSvgString", () => {
	it("accepts well-formed markup rooted at <svg>", () => {
		expect(
			isValidSvgString(
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>',
			),
		).toBe(true);
	});

	it("accepts a root <svg> without the namespace declaration", () => {
		expect(isValidSvgString("<svg><circle r='1'/></svg>")).toBe(true);
	});

	it("rejects the empty string", () => {
		expect(isValidSvgString("")).toBe(false);
	});

	it("rejects a value that is not a string at all", () => {
		expect(isValidSvgString(undefined as unknown as string)).toBe(false);
		expect(isValidSvgString(42 as unknown as string)).toBe(false);
	});

	it("rejects markup that does not parse as XML", () => {
		expect(isValidSvgString("<svg><rect></svg>")).toBe(false);
		expect(isValidSvgString("not markup")).toBe(false);
	});

	it("rejects well-formed markup rooted at another element", () => {
		expect(isValidSvgString("<g><rect/></g>")).toBe(false);
		expect(isValidSvgString("<div><svg/></div>")).toBe(false);
	});
});
