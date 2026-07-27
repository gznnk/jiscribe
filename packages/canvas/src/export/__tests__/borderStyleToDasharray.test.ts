import { describe, expect, it } from "vitest";

import { borderStyleToDasharray } from "../borderStyleToDasharray";

describe("borderStyleToDasharray", () => {
	it("maps dashed / dotted to the canvas stroke dash rhythm, scaled by the width", () => {
		expect(borderStyleToDasharray("dashed", 2)).toBe("8 8");
		expect(borderStyleToDasharray("dotted", 2)).toBe("2 4");
		expect(borderStyleToDasharray("dashed", 1)).toBe("4 4");
	});

	it("returns undefined for a continuous border", () => {
		expect(borderStyleToDasharray("solid", 2)).toBeUndefined();
	});

	it("returns undefined for border styles outside StrokeDashType", () => {
		expect(borderStyleToDasharray("none", 2)).toBeUndefined();
		expect(borderStyleToDasharray("groove", 2)).toBeUndefined();
		expect(borderStyleToDasharray("", 2)).toBeUndefined();
	});
});
