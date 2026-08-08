import type { Point, Rect, TransformedFrame } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { ExtraConnectPoint } from "../../registry/ObjectExtraConnectPointsRegistry";
import {
	calcConnectPoint,
	calcConnectPointDirection,
	calcEdgeAnchorDirection,
	calcEdgeAnchorFromPoint,
	calcEdgeAnchorPoint,
	calcExtraConnectPoint,
	calcExtraConnectPointDirection,
} from "../calcConnectPoint";

const baseFrame: TransformedFrame = {
	cx: 0,
	cy: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

// Home-plate pentagon (tip 0.3): the vertical edges only span y = -50 … 20.
const homePlate: Point[] = [
	{ x: -50, y: -50 },
	{ x: 50, y: -50 },
	{ x: 50, y: 20 },
	{ x: 0, y: 50 },
	{ x: -50, y: 20 },
];

// The rectangular band above the tip, as ObjectAnchorRegionRegistry would report it.
const bodyBand: Rect = { x: -50, y: -50, width: 100, height: 70 };

describe("calcConnectPoint", () => {
	describe("with an outline", () => {
		it("centers the side anchors on the anchor region, not the bounding box", () => {
			expect(
				calcConnectPoint(baseFrame, "leftCenter", homePlate, bodyBand),
			).toEqual({ x: -50, y: -15 });
			expect(
				calcConnectPoint(baseFrame, "rightCenter", homePlate, bodyBand),
			).toEqual({ x: 50, y: -15 });
		});

		it("keeps the top / bottom anchors on the silhouette's extremes", () => {
			expect(
				calcConnectPoint(baseFrame, "topCenter", homePlate, bodyBand),
			).toEqual({ x: 0, y: -50 });
			// straight down from the region center lands on the tip
			expect(
				calcConnectPoint(baseFrame, "bottomCenter", homePlate, bodyBand),
			).toEqual({ x: 0, y: 50 });
		});

		it("falls back to the bounding-box center band without an anchor region", () => {
			expect(calcConnectPoint(baseFrame, "leftCenter", homePlate)).toEqual({
				x: -50,
				y: 0,
			});
		});

		it("follows rotation and flip", () => {
			const rotated = calcConnectPoint(
				{ ...baseFrame, rotation: 90 },
				"leftCenter",
				homePlate,
				bodyBand,
			);
			expect(rotated.x).toBeCloseTo(15);
			expect(rotated.y).toBeCloseTo(-50);

			expect(
				calcConnectPoint(
					{ ...baseFrame, scaleX: -1 },
					"leftCenter",
					homePlate,
					bodyBand,
				),
			).toEqual({ x: 50, y: -15 });
		});
	});

	describe("without an outline", () => {
		it("resolves the bounding-box edge midpoint, matching calcFrameKeyPoint", () => {
			const frame = { ...baseFrame, cx: 200, cy: 300, width: 100, height: 60 };

			expect(calcConnectPoint(frame, "leftCenter")).toEqual({
				x: 150,
				y: 300,
			});
			expect(calcConnectPoint(frame, "bottomCenter")).toEqual({
				x: 200,
				y: 330,
			});
		});

		it("still applies the anchor region on the axis the ray does not travel", () => {
			expect(calcConnectPoint(baseFrame, "leftCenter", null, bodyBand)).toEqual(
				{ x: -50, y: -15 },
			);
			// travelling vertically, so the region only shifts x (unchanged here)
			expect(calcConnectPoint(baseFrame, "topCenter", null, bodyBand)).toEqual({
				x: 0,
				y: -50,
			});
		});
	});

	it("ignores a non-finite anchor region rather than returning NaN", () => {
		// A plugin calculator dividing by a degenerate shape size can hand back NaN.
		const broken = { x: NaN, y: NaN, width: NaN, height: NaN };
		expect(
			calcConnectPoint(baseFrame, "leftCenter", homePlate, broken),
		).toEqual({ x: -50, y: 0 });
	});
});

describe("calcConnectPointDirection", () => {
	it("returns the anchor's own outward normal", () => {
		expect(calcConnectPointDirection(baseFrame, "leftCenter")).toBe("left");
		expect(calcConnectPointDirection(baseFrame, "rightCenter")).toBe("right");
		expect(calcConnectPointDirection(baseFrame, "topCenter")).toBe("up");
		expect(calcConnectPointDirection(baseFrame, "bottomCenter")).toBe("down");
	});

	it("rotates with the shape", () => {
		const rotated = { ...baseFrame, rotation: 90 };
		expect(calcConnectPointDirection(rotated, "rightCenter")).toBe("down");
		expect(calcConnectPointDirection(rotated, "topCenter")).toBe("right");
	});

	it("mirrors with a flipped shape", () => {
		expect(
			calcConnectPointDirection({ ...baseFrame, scaleX: -1 }, "rightCenter"),
		).toBe("left");
		expect(
			calcConnectPointDirection({ ...baseFrame, scaleY: -1 }, "topCenter"),
		).toBe("down");
	});

	it("stays on the correct axis for a tall shape whose anchor region shifts the anchor", () => {
		// A "center → anchor" vector would tip onto the vertical axis here.
		const tall = { ...baseFrame, width: 40, height: 400 };
		expect(calcConnectPointDirection(tall, "leftCenter")).toBe("left");
	});
});

// A declared anchor on the left edge, half way up: the brace's tip in miniature.
const leftTip: ExtraConnectPoint = {
	id: "tip",
	point: { x: -50, y: -25 },
	direction: { x: -1, y: 0 },
};

describe("calcExtraConnectPoint", () => {
	it("returns the declared point translated onto the shape", () => {
		expect(
			calcExtraConnectPoint({ ...baseFrame, cx: 200, cy: 300 }, leftTip),
		).toEqual({ x: 150, y: 275 });
	});

	it("follows rotation", () => {
		const rotated = calcExtraConnectPoint(
			{ ...baseFrame, rotation: 90 },
			leftTip,
		);
		expect(rotated.x).toBeCloseTo(25);
		expect(rotated.y).toBeCloseTo(-50);
	});

	it("follows a flip", () => {
		expect(
			calcExtraConnectPoint({ ...baseFrame, scaleX: -1 }, leftTip),
		).toEqual({ x: 50, y: -25 });
		expect(
			calcExtraConnectPoint({ ...baseFrame, scaleY: -1 }, leftTip),
		).toEqual({ x: -50, y: 25 });
	});

	it("ignores the outline: the declared point is taken as given", () => {
		// The home plate's silhouette is nowhere near (-50, -25) on that ray, and
		// there is no outline parameter to consult anyway.
		expect(calcExtraConnectPoint(baseFrame, leftTip)).toEqual({
			x: -50,
			y: -25,
		});
	});
});

describe("calcExtraConnectPointDirection", () => {
	it("returns the declared outward direction", () => {
		expect(calcExtraConnectPointDirection(baseFrame, leftTip)).toBe("left");
	});

	it("follows rotation and flip", () => {
		expect(
			calcExtraConnectPointDirection({ ...baseFrame, rotation: 90 }, leftTip),
		).toBe("up");
		expect(
			calcExtraConnectPointDirection({ ...baseFrame, scaleX: -1 }, leftTip),
		).toBe("right");
	});

	it("snaps a diagonal declaration onto one axis", () => {
		const diagonal: ExtraConnectPoint = {
			...leftTip,
			direction: { x: -1, y: -0.2 },
		};
		expect(calcExtraConnectPointDirection(baseFrame, diagonal)).toBe("left");
	});
});

describe("calcEdgeAnchorPoint", () => {
	it("reproduces the matching edge midpoint at t 0.5", () => {
		for (const [side, connectPointId] of [
			["top", "topCenter"],
			["right", "rightCenter"],
			["bottom", "bottomCenter"],
			["left", "leftCenter"],
		] as const) {
			expect(
				calcEdgeAnchorPoint(baseFrame, { kind: "edge", side, t: 0.5 }),
			).toEqual(calcConnectPoint(baseFrame, connectPointId));
		}
	});

	it("measures t left → right on the horizontal sides", () => {
		expect(
			calcEdgeAnchorPoint(baseFrame, { kind: "edge", side: "top", t: 0.25 }),
		).toEqual({ x: -25, y: -50 });
		expect(
			calcEdgeAnchorPoint(baseFrame, { kind: "edge", side: "bottom", t: 0.75 }),
		).toEqual({ x: 25, y: 50 });
	});

	it("measures t top → bottom on the vertical sides", () => {
		expect(
			calcEdgeAnchorPoint(baseFrame, { kind: "edge", side: "left", t: 0.25 }),
		).toEqual({ x: -50, y: -25 });
		expect(
			calcEdgeAnchorPoint(baseFrame, { kind: "edge", side: "right", t: 0.75 }),
		).toEqual({ x: 50, y: 25 });
	});

	it("clamps a ratio outside 0..1 and reads a non-finite one as the midpoint", () => {
		expect(
			calcEdgeAnchorPoint(baseFrame, { kind: "edge", side: "top", t: 2 }),
		).toEqual({ x: 50, y: -50 });
		expect(
			calcEdgeAnchorPoint(baseFrame, { kind: "edge", side: "top", t: -1 }),
		).toEqual({ x: -50, y: -50 });
		expect(
			calcEdgeAnchorPoint(baseFrame, { kind: "edge", side: "top", t: NaN }),
		).toEqual({ x: 0, y: -50 });
	});

	it("carries the shape's rotation, so the local side turns with it", () => {
		const rotated: TransformedFrame = { ...baseFrame, rotation: 90 };
		// Local (-25, -50) rotates to (50, -25).
		const point = calcEdgeAnchorPoint(rotated, {
			kind: "edge",
			side: "top",
			t: 0.25,
		});
		expect(point.x).toBeCloseTo(50);
		expect(point.y).toBeCloseTo(-25);
	});

	it("mirrors the ratio under a flip rather than renumbering it", () => {
		const flipped: TransformedFrame = { ...baseFrame, scaleX: -1 };
		expect(
			calcEdgeAnchorPoint(flipped, { kind: "edge", side: "top", t: 0.25 }),
		).toEqual({ x: 25, y: -50 });
	});

	it("lands on the outline, spreading the ratio over the anchor region", () => {
		// t 0.25 over the body band starts the ray at local x = -25, where the
		// pentagon's left slope has not begun: the hit is still the flat top.
		expect(
			calcEdgeAnchorPoint(
				baseFrame,
				{ kind: "edge", side: "bottom", t: 0.25 },
				homePlate,
				bodyBand,
			),
		).toEqual({ x: -25, y: 35 });
	});

	it("falls back to the bounding box when the ray misses the outline", () => {
		expect(
			calcEdgeAnchorPoint(baseFrame, { kind: "edge", side: "top", t: 0.25 }, [
				{ x: 0, y: 0 },
			]),
		).toEqual({ x: -25, y: -50 });
	});
});

describe("calcEdgeAnchorDirection", () => {
	it("returns each side's outward normal", () => {
		expect(calcEdgeAnchorDirection(baseFrame, "top")).toBe("up");
		expect(calcEdgeAnchorDirection(baseFrame, "right")).toBe("right");
		expect(calcEdgeAnchorDirection(baseFrame, "bottom")).toBe("down");
		expect(calcEdgeAnchorDirection(baseFrame, "left")).toBe("left");
	});

	it("follows the shape's rotation and flips", () => {
		expect(calcEdgeAnchorDirection({ ...baseFrame, rotation: 90 }, "top")).toBe(
			"right",
		);
		expect(calcEdgeAnchorDirection({ ...baseFrame, scaleY: -1 }, "top")).toBe(
			"down",
		);
	});
});

describe("calcEdgeAnchorFromPoint", () => {
	it("round-trips a point produced by calcEdgeAnchorPoint", () => {
		for (const side of ["top", "right", "bottom", "left"] as const) {
			// The ends are left out: a corner belongs to two sides equally, and which
			// one it resolves to is the tie order's business (covered below).
			for (const t of [0.1, 0.25, 0.5, 0.8, 0.9]) {
				const anchor = { kind: "edge", side, t } as const;
				const point = calcEdgeAnchorPoint(baseFrame, anchor);
				expect(calcEdgeAnchorFromPoint(baseFrame, point)).toEqual(anchor);
			}
		}
	});

	it("breaks a corner tie in top → right → bottom → left order", () => {
		// The top-right corner is top / 1 and right / 0 at once.
		expect(calcEdgeAnchorFromPoint(baseFrame, { x: 50, y: -50 })).toEqual({
			kind: "edge",
			side: "top",
			t: 1,
		});
		// The bottom-left corner is bottom / 0 and left / 1 at once.
		expect(calcEdgeAnchorFromPoint(baseFrame, { x: -50, y: 50 })).toEqual({
			kind: "edge",
			side: "bottom",
			t: 0,
		});
	});

	it("round-trips through a rotation and a flip", () => {
		const turned: TransformedFrame = {
			...baseFrame,
			rotation: 30,
			scaleX: -1,
		};
		const anchor = { kind: "edge", side: "right", t: 0.3 } as const;
		const point = calcEdgeAnchorPoint(turned, anchor);
		expect(calcEdgeAnchorFromPoint(turned, point)).toEqual(anchor);
	});

	it("rounds a position inside the shape onto the side it is nearest to", () => {
		expect(calcEdgeAnchorFromPoint(baseFrame, { x: 10, y: -40 })).toEqual({
			kind: "edge",
			side: "top",
			t: 0.6,
		});
		expect(calcEdgeAnchorFromPoint(baseFrame, { x: 40, y: 10 })).toEqual({
			kind: "edge",
			side: "right",
			t: 0.6,
		});
	});

	it("clamps a position past a corner to the end of the side it picks", () => {
		expect(calcEdgeAnchorFromPoint(baseFrame, { x: 200, y: -200 })).toEqual({
			kind: "edge",
			side: "top",
			t: 1,
		});
	});

	it("measures the ratio over the anchor region when one is registered", () => {
		// The band spans y = -50 … 20, so local y = 6 is 0.8 along it where the
		// bounding box would call it 0.56.
		expect(
			calcEdgeAnchorFromPoint(baseFrame, { x: -50, y: 6 }, bodyBand),
		).toEqual({ kind: "edge", side: "left", t: 0.8 });
		expect(calcEdgeAnchorFromPoint(baseFrame, { x: -50, y: 6 })).toEqual({
			kind: "edge",
			side: "left",
			t: 0.56,
		});
	});
});
