import { describe, it, expect } from "vitest";

import { AUTO_COLOR, isAutoColor } from "../autoColor";

describe("autoColor", () => {
	it('AUTO_COLOR は "auto"', () => {
		expect(AUTO_COLOR).toBe("auto");
	});

	it("isAutoColor は sentinel のみ true", () => {
		expect(isAutoColor("auto")).toBe(true);
	});

	it("具体色・その他の値は false", () => {
		expect(isAutoColor("#6b7280")).toBe(false);
		expect(isAutoColor("transparent")).toBe(false);
		expect(isAutoColor("currentColor")).toBe(false);
		expect(isAutoColor(undefined)).toBe(false);
		expect(isAutoColor(null)).toBe(false);
		expect(isAutoColor("")).toBe(false);
	});
});
