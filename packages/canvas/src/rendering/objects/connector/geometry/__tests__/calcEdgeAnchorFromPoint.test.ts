import { calcEdgeAnchorPoint } from "@jiscribe/doc/model/objects/connector/calcConnectPoint";
import type { Rect, TransformedFrame } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { calcEdgeAnchorFromPoint } from "../calcEdgeAnchorFromPoint";

const baseFrame: TransformedFrame = {
	cx: 0,
	cy: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

// The rectangular band above a home-plate pentagon's tip, as ObjectAnchorRegionRegistry would report it.
const bodyBand: Rect = { x: -50, y: -50, width: 100, height: 70 };

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
