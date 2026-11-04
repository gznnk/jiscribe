import { describe, expect, it } from "vitest";

import { spreadSideEnds } from "../spreadSideEnds";

describe("spreadSideEnds", () => {
	it("leaves ends alone that are already a gap apart in heading order", () => {
		expect(
			spreadSideEnds(
				[
					{ t: 0.2, heading: 0.2 },
					{ t: 0.8, heading: 0.8 },
				],
				100,
				12,
			),
		).toEqual([0.2, 0.8]);
	});

	it("opens ends that collide, in the order they are headed", () => {
		// The second end is headed past the side's start, so it goes first even
		// though it was placed after the first one.
		expect(
			spreadSideEnds(
				[
					{ t: 0.19, heading: 0.19 },
					{ t: 0.2, heading: -1 },
				],
				100,
				12,
			),
		).toEqual([0.32, 0.2]);
	});

	it("settles a chain and pulls it back from the side's end", () => {
		const positions = spreadSideEnds(
			[
				{ t: 0.95, heading: 0.9 },
				{ t: 0.95, heading: 1.5 },
				{ t: 0.95, heading: 2 },
			],
			100,
			12,
		);
		expect(positions[0]).toBeCloseTo(0.76, 6);
		expect(positions[1]).toBeCloseTo(0.88, 6);
		expect(positions[2]).toBe(1);
	});
});
