import { describe, expect, it } from "vitest";

import { contentBox } from "../contentBox";

describe("contentBox", () => {
	it("takes only the shared text padding off a plain box", () => {
		expect(contentBox("rect", 200, 100)).toEqual({
			x: -100 + 6,
			y: -50 + 2,
			width: 200 - 12,
			height: 100 - 4,
		});
	});

	it("treats an unknown type as a plain box", () => {
		expect(contentBox("somethingNobodyShips", 200, 100)).toEqual(
			contentBox("rect", 200, 100),
		);
	});

	it("takes half the shorter side off each end of a wide stadium", () => {
		// The caps sit left and right; 240 - 2 x 40 - 12 is what is left to wrap in.
		expect(contentBox("stadium", 240, 80)).toMatchObject({
			width: 148,
			height: 76,
		});
	});

	it("moves a stadium's caps to the ends of the long axis when it is tall", () => {
		expect(contentBox("stadium", 80, 240)).toMatchObject({
			width: 68,
			height: 240 - 80 - 4,
		});
	});

	it("takes the two elliptical caps off a db's height, the top one whole", () => {
		expect(contentBox("db", 200, 100)).toMatchObject({
			width: 188,
			height: 100 - 24 - 12 - 4,
		});
	});

	it("leaves a container only its header band", () => {
		expect(contentBox("container", 240, 160)).toMatchObject({
			width: 228,
			height: 28 - 4,
		});
	});

	it("pays for a note's fold in width alone", () => {
		expect(contentBox("note", 200, 100)).toMatchObject({
			width: 200 - 20 - 12,
			height: 96,
		});
	});

	it("reports no box for a shape whose label is drawn outside the outline", () => {
		expect(contentBox("actor", 80, 120)).toBeNull();
		expect(contentBox("brace", 40, 200)).toBeNull();
	});

	it("reports no box for a shape carrying no text", () => {
		expect(contentBox("lucideIcon", 64, 64)).toBeNull();
	});

	it("clamps to zero rather than reporting a negative box", () => {
		expect(contentBox("rect", 4, 2)).toMatchObject({ width: 0, height: 0 });
	});
});
