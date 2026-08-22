import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ContentBoxShape } from "../resolveContentBox";
import { resolveContentBox } from "../resolveContentBox";

/** The rectangle of a `region` answer, so a size assertion stays one line. */
const contentRectOf = (shape: ContentBoxShape): Rect | null => {
	const resolution = resolveContentBox(shape);
	expect(resolution.kind).toBe("region");
	return resolution.kind === "region" ? resolution.rect : null;
};

describe("resolveContentBox", () => {
	it("takes only the shared text padding off a plain box", () => {
		expect(contentRectOf({ type: "rect", width: 200, height: 100 })).toEqual({
			x: -100 + 6,
			y: -50 + 2,
			width: 200 - 12,
			height: 100 - 4,
		});
	});

	it("tells a type nothing ships apart from one with no region of its own", () => {
		expect(
			resolveContentBox({
				type: "somethingNobodyShips",
				width: 200,
				height: 100,
			}),
		).toEqual({ kind: "unknown" });
	});

	it("takes half the shorter side off each end of a wide stadium", () => {
		// The caps sit left and right; 240 - 2 x 40 - 12 is what is left to wrap in.
		expect(
			contentRectOf({ type: "stadium", width: 240, height: 80 }),
		).toMatchObject({
			width: 148,
			height: 76,
		});
	});

	it("moves a stadium's caps to the ends of the long axis when it is tall", () => {
		expect(
			contentRectOf({ type: "stadium", width: 80, height: 240 }),
		).toMatchObject({
			width: 68,
			height: 240 - 80 - 4,
		});
	});

	it("takes the two elliptical caps off a db's height, the top one whole", () => {
		expect(
			contentRectOf({ type: "db", width: 200, height: 100 }),
		).toMatchObject({
			width: 188,
			height: 100 - 24 - 12 - 4,
		});
	});

	it("leaves a container only its header band", () => {
		expect(
			contentRectOf({ type: "container", width: 240, height: 160 }),
		).toMatchObject({
			width: 228,
			height: 28 - 4,
		});
	});

	it("pays for a note's fold in width alone", () => {
		expect(
			contentRectOf({ type: "note", width: 200, height: 100 }),
		).toMatchObject({
			width: 200 - 20 - 12,
			height: 96,
		});
	});

	it("reports outside for a shape whose label is drawn outside the outline", () => {
		expect(
			resolveContentBox({ type: "actor", width: 80, height: 120 }),
		).toEqual({ kind: "outside" });
		expect(
			resolveContentBox({ type: "brace", width: 40, height: 200 }),
		).toEqual({ kind: "outside" });
	});

	it("reports outside for a shipped shape that declares no region at all", () => {
		expect(
			resolveContentBox({ type: "lucideIcon", width: 64, height: 64 }),
		).toEqual({ kind: "outside" });
	});

	it("clamps to zero rather than reporting a negative box", () => {
		expect(contentRectOf({ type: "rect", width: 4, height: 2 })).toMatchObject({
			width: 0,
			height: 0,
		});
	});
});
