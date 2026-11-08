import { describe, expect, it } from "vitest";

import { solveSeparation } from "../solveSeparation";

describe("solveSeparation", () => {
	it("finds the least-squares positions where merging along violated pairs alone does not", () => {
		const free = { isFixed: false, low: -Infinity, high: Infinity };
		// Merging puts all three in one block; the pair 0 → 1 then holds 1 back.
		const solved = solveSeparation(
			[
				{ ...free, desired: 24 },
				{ ...free, desired: 36 },
				{ ...free, desired: 12 },
			],
			[
				{ left: 0, right: 1, gap: 16 },
				{ left: 0, right: 2, gap: 12 },
			],
		);

		expect(solved.map((position) => Math.round(position * 1e6) / 1e6)).toEqual([
			12, 36, 24,
		]);
	});
});
