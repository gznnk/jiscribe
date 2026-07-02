import { describe, it, expect } from "vitest";

import { AUTO_COLOR, isAutoColor } from "../autoColor";

describe("autoColor", () => {
	it('AUTO_COLOR is "auto"', () => {
		expect(AUTO_COLOR).toBe("auto");
	});

	it("isAutoColor is true only for the sentinel", () => {
		expect(isAutoColor("auto")).toBe(true);
	});

	it("concrete colors and other values are false", () => {
		expect(isAutoColor("#6b7280")).toBe(false);
		expect(isAutoColor("transparent")).toBe(false);
		expect(isAutoColor("currentColor")).toBe(false);
		expect(isAutoColor(undefined)).toBe(false);
		expect(isAutoColor(null)).toBe(false);
		expect(isAutoColor("")).toBe(false);
	});
});
