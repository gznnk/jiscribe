import { describe, expect, it } from "vitest";

import {
	buildUmlComponentBodyPath,
	buildUmlComponentIconPaths,
} from "../buildUmlComponentPaths";

/**
 * Coordinates of a rectangle path built by buildRectPath, whose commands alternate
 * x and y from the top-left corner: `M x y H x2 V y2 H x Z`.
 */
const rectPathCoords = (
	path: string,
): { xs: number[]; ys: number[]; left: number } => {
	const numbers = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number);
	const xs = numbers.filter((_unused, index) => index % 2 === 0);
	const ys = numbers.filter((_unused, index) => index % 2 === 1);
	return { xs, ys, left: xs[0] };
};

describe("buildUmlComponentBodyPath", () => {
	it("closes the box over its four corners", () => {
		expect(buildUmlComponentBodyPath(-80, -45, 160, 90)).toBe(
			"M -80 -45 H 80 V 45 H -80 Z",
		);
	});
});

describe("buildUmlComponentIconPaths", () => {
	// The agreed drawing, in the mock's own coordinates: a 180x90 box at (10, 10),
	// i.e. its top-right corner at (190, 10). Body 16x20 at (166, 18), tabs 12x5 at
	// (160, 21) and (160, 30).
	const paths = buildUmlComponentIconPaths(190, 10);

	it("places the body 8px in from the top-right corner", () => {
		expect(paths[0]).toBe("M 166 18 H 182 V 38 H 166 Z");
	});

	it("straddles the body's left edge with both tabs, 4px apart", () => {
		expect(paths[1]).toBe("M 160 21 H 172 V 26 H 160 Z");
		expect(paths[2]).toBe("M 160 30 H 172 V 35 H 160 Z");
	});

	it("paints the body before the tabs, which is what hides the crossings", () => {
		expect(paths).toHaveLength(3);
		// A tab starting left of the body is a tab drawn over it, not beside it.
		expect(rectPathCoords(paths[1]).left).toBeLessThan(
			rectPathCoords(paths[0]).left,
		);
	});

	it("keeps every piece inside the box it hangs in", () => {
		const box = { left: 10, top: 10, right: 190, bottom: 100 };
		for (const path of paths) {
			const { xs, ys } = rectPathCoords(path);
			expect(Math.min(...xs)).toBeGreaterThan(box.left);
			expect(Math.max(...xs)).toBeLessThan(box.right);
			expect(Math.min(...ys)).toBeGreaterThan(box.top);
			expect(Math.max(...ys)).toBeLessThan(box.bottom);
		}
	});
});
