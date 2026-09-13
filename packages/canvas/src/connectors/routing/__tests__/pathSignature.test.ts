import { describe, expect, it } from "vitest";

import { calcPathSignature } from "../pathSignature";

describe("calcPathSignature", () => {
	it("encodes each segment as R/L/D/U in order", () => {
		expect(
			calcPathSignature([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 100, y: 50 },
				{ x: 40, y: 50 },
				{ x: 40, y: 10 },
			]),
		).toBe("RDLU");
	});

	it("stays identical when the route stretches without changing shape", () => {
		const short = calcPathSignature([
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 50, y: 30 },
		]);
		const stretched = calcPathSignature([
			{ x: 0, y: 0 },
			{ x: 500, y: 0 },
			{ x: 500, y: 300 },
		]);
		expect(short).toBe("RD");
		expect(stretched).toBe(short);
	});

	it("skips zero-length segments", () => {
		expect(
			calcPathSignature([
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
				{ x: 0, y: -20 },
			]),
		).toBe("U");
	});

	it("returns an empty string for fewer than 2 points", () => {
		expect(calcPathSignature([])).toBe("");
		expect(calcPathSignature([{ x: 1, y: 2 }])).toBe("");
	});
});
