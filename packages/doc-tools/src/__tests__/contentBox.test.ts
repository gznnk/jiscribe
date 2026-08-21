import { describe, expect, it } from "vitest";

import { contentBox } from "../contentBox";

describe("contentBox", () => {
	it("takes only the shared text padding off a plain box", () => {
		expect(contentBox({ type: "rect", width: 200, height: 100 })).toEqual({
			x: -100 + 6,
			y: -50 + 2,
			width: 200 - 12,
			height: 100 - 4,
		});
	});

	it("reports no box for a type nothing ships, which declares no region", () => {
		expect(
			contentBox({ type: "somethingNobodyShips", width: 200, height: 100 }),
		).toBeNull();
	});

	it("takes half the shorter side off each end of a wide stadium", () => {
		// The caps sit left and right; 240 - 2 x 40 - 12 is what is left to wrap in.
		expect(
			contentBox({ type: "stadium", width: 240, height: 80 }),
		).toMatchObject({
			width: 148,
			height: 76,
		});
	});

	it("moves a stadium's caps to the ends of the long axis when it is tall", () => {
		expect(
			contentBox({ type: "stadium", width: 80, height: 240 }),
		).toMatchObject({
			width: 68,
			height: 240 - 80 - 4,
		});
	});

	it("takes the two elliptical caps off a db's height, the top one whole", () => {
		expect(contentBox({ type: "db", width: 200, height: 100 })).toMatchObject({
			width: 188,
			height: 100 - 24 - 12 - 4,
		});
	});

	it("leaves a container only its header band", () => {
		expect(
			contentBox({ type: "container", width: 240, height: 160 }),
		).toMatchObject({
			width: 228,
			height: 28 - 4,
		});
	});

	it("pays for a note's fold in width alone", () => {
		expect(contentBox({ type: "note", width: 200, height: 100 })).toMatchObject(
			{
				width: 200 - 20 - 12,
				height: 96,
			},
		);
	});

	it("reports no box for a shape whose label is drawn outside the outline", () => {
		expect(contentBox({ type: "actor", width: 80, height: 120 })).toBeNull();
		expect(contentBox({ type: "brace", width: 40, height: 200 })).toBeNull();
	});

	it("reports no box for a shape carrying no text", () => {
		expect(
			contentBox({ type: "lucideIcon", width: 64, height: 64 }),
		).toBeNull();
	});

	it("clamps to zero rather than reporting a negative box", () => {
		expect(contentBox({ type: "rect", width: 4, height: 2 })).toMatchObject({
			width: 0,
			height: 0,
		});
	});
});
