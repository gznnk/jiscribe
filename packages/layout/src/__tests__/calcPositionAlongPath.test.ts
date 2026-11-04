import { describe, expect, it } from "vitest";

import { calcPositionAlongPath } from "../calcPositionAlongPath";

describe("calcPositionAlongPath", () => {
	const path = [
		{ x: 0, y: 0 },
		{ x: 100, y: 0 },
		{ x: 100, y: 100 },
	];

	it("answers the fraction of the length before the point", () => {
		expect(calcPositionAlongPath(path, { x: 50, y: 0 })).toBe(0.25);
		expect(calcPositionAlongPath(path, { x: 100, y: 50 })).toBe(0.75);
	});

	it("projects a point off the path onto its nearest segment", () => {
		expect(calcPositionAlongPath(path, { x: 110, y: 80 })).toBe(0.9);
	});

	it("clamps to the ends and answers 0 for a path with no length", () => {
		expect(calcPositionAlongPath(path, { x: -40, y: -5 })).toBe(0);
		expect(calcPositionAlongPath(path, { x: 100, y: 300 })).toBe(1);
		expect(
			calcPositionAlongPath(
				[
					{ x: 1, y: 1 },
					{ x: 1, y: 1 },
				],
				{ x: 5, y: 5 },
			),
		).toBe(0);
	});
});
