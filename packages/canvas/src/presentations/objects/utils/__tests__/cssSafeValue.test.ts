import { describe, expect, it } from "vitest";

import { cssSafeValue } from "../cssSafeValue";

describe("cssSafeValue", () => {
	it("安全な値はそのまま返す", () => {
		expect(cssSafeValue("#ff0000")).toBe("#ff0000");
		expect(cssSafeValue('"Noto Sans JP", sans-serif')).toBe(
			'"Noto Sans JP", sans-serif',
		);
	});

	it("危険な値は fallback を返す", () => {
		expect(cssSafeValue("red; } body {")).toBe("inherit");
		expect(cssSafeValue("url(x)", "transparent")).toBe("transparent");
	});
});
