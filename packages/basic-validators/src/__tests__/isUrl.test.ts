import { describe, it, expect } from "vitest";

import { isUrl } from "../isUrl";

describe("isUrl", () => {
	it("returns true for a valid URL", () => {
		expect(isUrl("https://example.com")).toBe(true);
		expect(isUrl("http://localhost:3000")).toBe(true);
		expect(isUrl("https://example.com/path?q=1#hash")).toBe(true);
	});

	it("returns false for an invalid string", () => {
		expect(isUrl("not-a-url")).toBe(false);
		expect(isUrl("")).toBe(false);
		expect(isUrl("example.com")).toBe(false);
	});

	it("returns false for a non-string", () => {
		expect(isUrl(null)).toBe(false);
		expect(isUrl(undefined)).toBe(false);
		expect(isUrl(42)).toBe(false);
	});
});
