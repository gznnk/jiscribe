import { describe, it, expect } from "vitest";

import { isCssSafeValue } from "../isCssSafeValue";

describe("isCssSafeValue", () => {
	it("returns true for an ordinary CSS value", () => {
		expect(isCssSafeValue("bold")).toBe(true);
		expect(isCssSafeValue("600")).toBe(true);
		expect(isCssSafeValue("#10b981")).toBe(true);
		expect(isCssSafeValue('"Noto Sans JP", sans-serif')).toBe(true);
		expect(isCssSafeValue("rgb(255, 0, 0)")).toBe(true);
	});

	it("returns false for a value containing a CSS breakout", () => {
		expect(isCssSafeValue("red; } body { background: black")).toBe(false);
		expect(isCssSafeValue("url(http://evil.example/x)")).toBe(false);
		expect(isCssSafeValue("</style><script>")).toBe(false);
		expect(isCssSafeValue("red /* comment */")).toBe(false);
		expect(isCssSafeValue("expression(alert(1))")).toBe(false);
	});

	it("returns false for a non-string", () => {
		expect(isCssSafeValue(42)).toBe(false);
		expect(isCssSafeValue(null)).toBe(false);
		expect(isCssSafeValue(undefined)).toBe(false);
		expect(isCssSafeValue({})).toBe(false);
	});
});
