import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { calcConnectorLabelAnchor } from "../calcConnectorLabelAnchor";
import { calcConnectorLabelPlacement } from "../calcConnectorLabelPlacement";

/** Horizontal rightward segment of length 100. Its leftward normal is the +y direction. */
const horizontal: Point[] = [
	{ x: 0, y: 0 },
	{ x: 100, y: 0 },
];

/** L shape of total length 200, bending at (100, 0). */
const lShape: Point[] = [
	{ x: 0, y: 0 },
	{ x: 100, y: 0 },
	{ x: 100, y: 100 },
];

describe("calcConnectorLabelPlacement", () => {
	it("maps the midpoint of a single segment to the default placement", () => {
		expect(calcConnectorLabelPlacement(horizontal, { x: 50, y: 0 })).toEqual({
			position: 0.5,
			offset: 0,
		});
	});

	it("signs the offset by the leftward normal (-dy, dx) of the travel direction", () => {
		expect(calcConnectorLabelPlacement(horizontal, { x: 50, y: 20 })).toEqual({
			position: 0.5,
			offset: 20,
		});
		expect(calcConnectorLabelPlacement(horizontal, { x: 50, y: -20 })).toEqual({
			position: 0.5,
			offset: -20,
		});
	});

	it("clamps a point beyond an end onto that end", () => {
		expect(calcConnectorLabelPlacement(horizontal, { x: -50, y: 0 })).toEqual({
			position: 0,
			offset: 0,
		});
		expect(calcConnectorLabelPlacement(horizontal, { x: 400, y: 0 })).toEqual({
			position: 1,
			offset: 0,
		});
	});

	it("picks the nearest segment across a multi segment path", () => {
		// Near the vertical leg: position is measured over the whole 200 length.
		expect(calcConnectorLabelPlacement(lShape, { x: 100, y: 50 })).toEqual({
			position: 0.75,
			offset: 0,
		});
		// Near the horizontal leg.
		expect(calcConnectorLabelPlacement(lShape, { x: 25, y: 5 })).toEqual({
			position: 0.125,
			offset: 5,
		});
	});

	it("gives an equidistant corner to the earlier segment", () => {
		// (110, -10) is 10*sqrt(2) away from the corner and equidistant from both
		// legs' projections, which both clamp to the corner.
		expect(calcConnectorLabelPlacement(lShape, { x: 110, y: -10 })).toEqual({
			position: 0.5,
			// Left normal of the horizontal leg is +y, so a point above the line is negative.
			offset: -10,
		});
	});

	it("skips zero length segments without consuming arc length", () => {
		const withDuplicate: Point[] = [
			{ x: 0, y: 0 },
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		];
		expect(calcConnectorLabelPlacement(withDuplicate, { x: 25, y: 0 })).toEqual(
			{
				position: 0.25,
				offset: 0,
			},
		);
	});

	it("returns null for a path that has no length", () => {
		expect(calcConnectorLabelPlacement([], { x: 0, y: 0 })).toBeNull();
		expect(
			calcConnectorLabelPlacement([{ x: 5, y: 5 }], { x: 0, y: 0 }),
		).toBeNull();
		expect(
			calcConnectorLabelPlacement(
				[
					{ x: 5, y: 5 },
					{ x: 5, y: 5 },
				],
				{ x: 0, y: 0 },
			),
		).toBeNull();
	});
});

describe("calcConnectorLabelPlacement - round trip with calcConnectorLabelAnchor", () => {
	const cases: { name: string; points: Point[]; placements: Point[] }[] = [
		{
			name: "single segment",
			points: horizontal,
			// x = position, y = offset
			placements: [
				{ x: 0.5, y: 0 },
				{ x: 0.2, y: 12 },
				{ x: 0.8, y: -7.5 },
			],
		},
		{
			name: "L shape",
			points: lShape,
			placements: [
				{ x: 0.25, y: 0 },
				{ x: 0.25, y: 9 },
				{ x: 0.9, y: -6 },
			],
		},
	];

	for (const { name, points, placements } of cases) {
		for (const { x: position, y: offset } of placements) {
			it(`${name}: position ${position} / offset ${offset} survives anchor → placement`, () => {
				const anchor = calcConnectorLabelAnchor(points, position, offset);
				expect(anchor).not.toBeNull();

				const placement = calcConnectorLabelPlacement(points, anchor!);
				expect(placement).not.toBeNull();
				expect(placement!.position).toBeCloseTo(position, 10);
				expect(placement!.offset).toBeCloseTo(offset, 10);
			});
		}
	}
});
