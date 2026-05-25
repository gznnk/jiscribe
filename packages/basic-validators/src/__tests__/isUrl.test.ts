import { describe, it, expect } from "vitest";

import { isUrl } from "../isUrl";

describe("isUrl", () => {
	it("有効なURLはtrueを返す", () => {
		expect(isUrl("https://example.com")).toBe(true);
		expect(isUrl("http://localhost:3000")).toBe(true);
		expect(isUrl("https://example.com/path?q=1#hash")).toBe(true);
	});

	it("無効な文字列はfalseを返す", () => {
		expect(isUrl("not-a-url")).toBe(false);
		expect(isUrl("")).toBe(false);
		expect(isUrl("example.com")).toBe(false);
	});

	it("文字列以外はfalseを返す", () => {
		expect(isUrl(null)).toBe(false);
		expect(isUrl(undefined)).toBe(false);
		expect(isUrl(42)).toBe(false);
	});
});
