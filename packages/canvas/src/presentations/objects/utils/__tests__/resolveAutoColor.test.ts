import { describe, it, expect } from "vitest";

import { theme } from "../../../../constants/theme";
import { resolveAutoColor } from "../resolveAutoColor";

describe("resolveAutoColor", () => {
	it('resolves "auto" for the ink role to the shape ink token (theme.objectInk)', () => {
		expect(resolveAutoColor("auto", "ink")).toBe(theme.objectInk);
	});

	it('resolves "auto" for the surface role to the shape face token (theme.objectSurface)', () => {
		expect(resolveAutoColor("auto", "surface")).toBe(theme.objectSurface);
	});

	it("shape tokens are distinct from the UI chrome tokens", () => {
		expect(resolveAutoColor("auto", "ink")).not.toBe(theme.foreground);
		expect(resolveAutoColor("auto", "surface")).not.toBe(theme.surface);
	});

	it("returns a concrete color as-is regardless of role", () => {
		expect(resolveAutoColor("#6b7280", "ink")).toBe("#6b7280");
		expect(resolveAutoColor("#fef9c3", "surface")).toBe("#fef9c3");
		expect(resolveAutoColor("transparent", "surface")).toBe("transparent");
	});

	it("returns the role default when unspecified (ink: objectInk / surface: transparent)", () => {
		expect(resolveAutoColor(undefined, "ink")).toBe(theme.objectInk);
		expect(resolveAutoColor(undefined, "surface")).toBe("transparent");
	});

	it("prefers the fallback over the role default when unspecified", () => {
		expect(resolveAutoColor(undefined, "ink", "red")).toBe("red");
	});

	it('"auto" prefers the role token even when a fallback is given', () => {
		expect(resolveAutoColor("auto", "surface", "red")).toBe(
			theme.objectSurface,
		);
	});
});
