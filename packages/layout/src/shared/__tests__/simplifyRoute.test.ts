import { describe, expect, it } from "vitest";

import { dropCollinearPoints, simplifyRoute } from "../simplifyRoute";

describe("simplifyRoute", () => {
	it("drops a straight run's middle points and keeps its corners", () => {
		expect(
			simplifyRoute([
				{ x: 0, y: 0 },
				{ x: 5, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 10 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
		]);
	});

	it("keeps a corner given twice, once", () => {
		expect(
			simplifyRoute([
				{ x: 0, y: 0 },
				{ x: 0, y: 10 },
				{ x: 0, y: 10 },
				{ x: 10, y: 10 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 0, y: 10 },
			{ x: 10, y: 10 },
		]);
	});

	it("keeps the first of points a float's noise apart, even at the path's end", () => {
		const last = { x: 10, y: 1e-7 };
		expect(simplifyRoute([{ x: 0, y: 0 }, { x: 10, y: 0 }, last])).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		]);
	});
});

describe("dropCollinearPoints", () => {
	it("drops a corner given twice altogether", () => {
		expect(
			dropCollinearPoints([
				{ x: 0, y: 0 },
				{ x: 0, y: 10 },
				{ x: 0, y: 10 },
				{ x: 10, y: 10 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
		]);
	});

	it("always keeps the path's own last point", () => {
		const last = { x: 10, y: 1e-7 };
		expect(
			dropCollinearPoints([{ x: 0, y: 0 }, { x: 10, y: 0 }, last]),
		).toEqual([{ x: 0, y: 0 }, last]);
	});
});
