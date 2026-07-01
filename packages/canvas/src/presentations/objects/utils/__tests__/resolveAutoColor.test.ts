import { describe, it, expect } from "vitest";

import { theme } from "../../../../constants/theme";
import { resolveAutoColor } from "../resolveAutoColor";

describe("resolveAutoColor", () => {
	it('resolves "auto" for the ink role to the theme foreground (theme.foreground)', () => {
		expect(resolveAutoColor("auto", "ink")).toBe(theme.foreground);
	});

	it('resolves "auto" for the surface role to the theme surface (theme.surface)', () => {
		expect(resolveAutoColor("auto", "surface")).toBe(theme.surface);
	});

	it("returns a concrete color as-is regardless of role", () => {
		expect(resolveAutoColor("#6b7280", "ink")).toBe("#6b7280");
		expect(resolveAutoColor("#fef9c3", "surface")).toBe("#fef9c3");
		expect(resolveAutoColor("transparent", "surface")).toBe("transparent");
	});

	it("returns the role default when unspecified (ink: foreground / surface: transparent)", () => {
		expect(resolveAutoColor(undefined, "ink")).toBe(theme.foreground);
		expect(resolveAutoColor(undefined, "surface")).toBe("transparent");
	});

	it("prefers the fallback over the role default when unspecified", () => {
		expect(resolveAutoColor(undefined, "ink", "red")).toBe("red");
	});

	it('"auto" prefers the role token even when a fallback is given', () => {
		expect(resolveAutoColor("auto", "surface", "red")).toBe(theme.surface);
	});
});
