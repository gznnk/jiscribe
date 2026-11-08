import type { Point, Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { LabelPlacement } from "../../../shared/labelClearances";
import { EDGE_ROUTE_MARGIN } from "../../edgeRoutingCosts";
import { type RouteToLabel, placeRouteLabels } from "../placeRouteLabels";

const LABEL = { width: 40, height: 20 };

const route = (
	points: readonly (readonly [number, number])[],
	hasLabel = true,
): RouteToLabel => ({
	path: points.map(([x, y]) => ({ x, y })),
	label: hasLabel ? LABEL : undefined,
});

/** A route along y `y` from x 0 to `length`, which holds the label at x 58 only. */
const shortRun = (y: number, length = 116): RouteToLabel =>
	route([
		[0, y],
		[length, y],
	]);

/** The box the label is drawn in, centred where the placement puts it. */
const labelBoxOf = (
	{ path }: RouteToLabel,
	{ position, offset }: LabelPlacement,
): Rect => {
	const lengths = path
		.slice(1)
		.map((end, index) =>
			Math.hypot(end.x - path[index].x, end.y - path[index].y),
		);
	let remaining = position * lengths.reduce((sum, length) => sum + length, 0);
	let index = 0;
	while (index < lengths.length - 1 && remaining > lengths[index]) {
		remaining -= lengths[index];
		index += 1;
	}
	const start = path[index];
	const end = path[index + 1];
	const direction: Point = {
		x: (end.x - start.x) / lengths[index],
		y: (end.y - start.y) / lengths[index],
	};
	const centre = {
		x: start.x + direction.x * remaining - direction.y * offset,
		y: start.y + direction.y * remaining + direction.x * offset,
	};
	return {
		x: centre.x - LABEL.width / 2,
		y: centre.y - LABEL.height / 2,
		width: LABEL.width,
		height: LABEL.height,
	};
};

describe("placeRouteLabels", () => {
	it("puts a label on the middle of its route when nothing is in the way", () => {
		const placements = placeRouteLabels([shortRun(0, 400)], [], []);

		expect(placements).toEqual([{ position: 0.5, offset: 0 }]);
	});

	it("gives no placement to a route without a label", () => {
		const placements = placeRouteLabels(
			[
				route(
					[
						[0, 0],
						[400, 0],
					],
					false,
				),
				shortRun(100, 400),
			],
			[],
			[],
		);

		expect(placements).toEqual([undefined, { position: 0.5, offset: 0 }]);
	});

	it("keeps a label off a shape, the nearest spot to the middle first and the one nearer the source of two", () => {
		const shape = { x: 150, y: -50, width: 100, height: 100 };

		const [placement] = placeRouteLabels([shortRun(0, 400)], [shape], []);

		// The box only touches the shape at x 130.
		expect(placement).toEqual({ position: 130 / 400, offset: 0 });
	});

	it("sets a label beside its line, above it first, rather than across another route", () => {
		const crossing = route(
			[
				[0, 4],
				[116, 4],
			],
			false,
		);

		const [placement] = placeRouteLabels([shortRun(0), crossing], [], []);

		expect(placement).toEqual({ position: 0.5, offset: -16 });
	});

	it("crosses another route rather than cover a shape", () => {
		const crossing = route(
			[
				[0, 4],
				[116, 4],
			],
			false,
		);
		const shapes = [
			{ x: 0, y: -40, width: 116, height: 30 },
			{ x: 0, y: 10, width: 116, height: 30 },
		];

		const [placement] = placeRouteLabels([shortRun(0), crossing], shapes, []);

		expect(placement).toEqual({ position: 0.5, offset: 0 });
	});

	it("keeps off a label placed before it rather than off another route", () => {
		// The labels of the routes 26px above and below sit where this one's would
		// beside its line; the route through its own line's spot crosses it.
		const crossing = route(
			[
				[0, 4],
				[116, 4],
			],
			false,
		);
		const routes = [shortRun(-26), shortRun(26), shortRun(0), crossing];

		const placements = placeRouteLabels(routes, [], []);

		expect(placements.slice(0, 3)).toEqual([
			{ position: 0.5, offset: 0 },
			{ position: 0.5, offset: 0 },
			{ position: 0.5, offset: 0 },
		]);
	});

	it("keeps off a label placed before it, beside its line", () => {
		// The first route's label, on its line 14px below, covers this one's spot on its
		// line and the one below it.
		const placements = placeRouteLabels([shortRun(14), shortRun(0)], [], []);

		expect(placements).toEqual([
			{ position: 0.5, offset: 0 },
			{ position: 0.5, offset: -16 },
		]);
	});

	it("keeps off a frame's outline, but not its inside", () => {
		const frames = [{ x: 50, y: -100, width: 300, height: 200 }];
		const crossingFrame = { x: 200, y: -100, width: 200, height: 200 };

		const [inside] = placeRouteLabels([shortRun(0, 400)], [], frames);
		const [offOutline] = placeRouteLabels(
			[shortRun(0, 400)],
			[],
			[crossingFrame],
		);

		expect(inside).toEqual({ position: 0.5, offset: 0 });
		// The frame's left side at x 200 runs across the middle.
		expect(offOutline).toEqual({ position: 178 / 400, offset: 0 });
	});

	it("never puts a label within the margin of an end of its route", () => {
		// The shape covers the route but its first 50px.
		const shape = { x: 50, y: -50, width: 150, height: 100 };

		const [placement] = placeRouteLabels([shortRun(0, 200)], [shape], []);

		// The box nearest the clear stretch starts EDGE_ROUTE_MARGIN plus the corner
		// clearance in.
		const box = labelBoxOf(shortRun(0, 200), placement as LabelPlacement);
		expect(box.x).toBeCloseTo(EDGE_ROUTE_MARGIN + 8);
		expect(placement).toEqual({ position: 58 / 200, offset: 0 });
	});

	it("never puts a label within its clearance of a corner", () => {
		// Shapes cover both segments but for 50px either side of the corner.
		const corner = route([
			[0, 0],
			[200, 0],
			[200, 200],
		]);
		const shapes = [
			{ x: 0, y: -50, width: 150, height: 100 },
			{ x: 150, y: 50, width: 100, height: 150 },
		];

		const [placement] = placeRouteLabels([corner], shapes, []);

		const box = labelBoxOf(corner, placement as LabelPlacement);
		expect(box.y).toBeCloseTo(8);
		expect(placement).toEqual({ position: 218 / 400, offset: 0 });
	});

	it("sets a label beside the longest segment when no segment holds it", () => {
		// The allowed stretches are 30, 20 and 30px long; the label needs 56 along a
		// horizontal one and 36 along a vertical one.
		const jogging = route([
			[0, 0],
			[60, 0],
			[60, 20],
			[120, 20],
		]);

		const [placement] = placeRouteLabels([jogging], [], []);

		// Below the first segment the box would cross the second.
		expect(placement).toEqual({ position: 45 / 140, offset: -16 });
	});
});
