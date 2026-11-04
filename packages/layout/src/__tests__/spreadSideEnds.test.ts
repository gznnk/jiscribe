import { describe, expect, it } from "vitest";

import { spreadSideEnds } from "../spreadSideEnds";

describe("spreadSideEnds", () => {
	it("leaves ends alone that are already a gap apart", () => {
		expect(
			spreadSideEnds(
				[
					{ t: 0.2, isStraight: true },
					{ t: 0.8, isStraight: false },
				],
				100,
				12,
			),
		).toEqual([0.2, 0.8]);
	});

	it("moves the bent edge away from a straight one", () => {
		// 0.79 straight, 0.8 bent: the bent end goes to 0.79 + 0.12.
		expect(
			spreadSideEnds(
				[
					{ t: 0.8, isStraight: false },
					{ t: 0.79, isStraight: true },
				],
				100,
				12,
			),
		).toEqual([0.91, 0.79]);
	});

	it("splits the move when both are straight, and settles a chain", () => {
		const positions = spreadSideEnds(
			[
				{ t: 0.5, isStraight: true },
				{ t: 0.5, isStraight: true },
				{ t: 0.55, isStraight: true },
			],
			100,
			12,
		);
		const sorted = [...positions].sort((a, b) => a - b);
		expect(sorted[1] - sorted[0]).toBeCloseTo(0.12, 3);
		expect(sorted[2] - sorted[1]).toBeCloseTo(0.12, 3);
	});

	it("keeps every end on the side", () => {
		const positions = spreadSideEnds(
			[
				{ t: 0.98, isStraight: false },
				{ t: 0.97, isStraight: true },
			],
			100,
			12,
		);
		expect(positions[0]).toBe(1);
	});
});
