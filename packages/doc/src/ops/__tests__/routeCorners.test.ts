import { describe, expect, it } from "vitest";

import { toStoredRouteCorners } from "../utils/routeCorners";

describe("toStoredRouteCorners", () => {
	it("rounds every coordinate but the one each end's neighbour shares with that end", () => {
		expect(
			toStoredRouteCorners(
				[
					{ x: 30.5, y: 99.6 },
					{ x: 200.4, y: 99.6 },
					{ x: 200.4, y: 320.4 },
				],
				"bottom",
				"left",
			),
		).toEqual([
			{ x: 30.5, y: 100 },
			{ x: 200, y: 100 },
			{ x: 200, y: 320.4 },
		]);
	});

	it("drops a corner rounded onto the one before it", () => {
		expect(
			toStoredRouteCorners(
				[
					{ x: 30, y: 50.2 },
					{ x: 100.2, y: 50.2 },
					{ x: 100.2, y: 50.4 },
					{ x: 100.2, y: 200 },
				],
				"bottom",
				"left",
			),
		).toEqual([
			{ x: 30, y: 50 },
			{ x: 100, y: 50 },
			{ x: 100, y: 200 },
		]);
	});

	it("drops a corner rounded onto the straight line between its neighbours", () => {
		expect(
			toStoredRouteCorners(
				[
					{ x: 30, y: 50 },
					{ x: 100.3, y: 50 },
					{ x: 100.3, y: 50.4 },
					{ x: 300, y: 50.4 },
					{ x: 300, y: 200 },
				],
				"bottom",
				"left",
			),
		).toEqual([
			{ x: 30, y: 50 },
			{ x: 300, y: 50 },
			{ x: 300, y: 200 },
		]);
	});
});
