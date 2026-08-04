import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { ExtraConnectPoint } from "../../../../../../../presentations/objects/registry/ObjectExtraConnectPointsRegistry";
import { calcNearestAnchor } from "../calcNearestAnchor";

/** An unrotated, unscaled frame (center 100,100 / width 40 / height 20). */
const frame = {
	cx: 100,
	cy: 100,
	width: 40,
	height: 20,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};
// keyPoints: top(100,90) right(120,100) bottom(100,110) left(80,100)

/** A frame roomy enough that its middle is well past CENTER_ANCHOR_DEPTH_PX. */
const roomyFrame = {
	cx: 200,
	cy: 200,
	width: 200,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};
// edges: top y=150, bottom y=250, left x=100, right x=300

describe("calcNearestAnchor", () => {
	it("returns center for an object without a frame", () => {
		expect(calcNearestAnchor({}, 0, 0)).toEqual({ kind: "center" });
	});

	describe("named anchor snapping", () => {
		it("returns center for a cursor on the center", () => {
			expect(calcNearestAnchor(frame, 100, 100)).toEqual({ kind: "center" });
		});

		it("snaps to topCenter just outside the top edge", () => {
			expect(calcNearestAnchor(frame, 100, 88)).toEqual({
				kind: "connectPoint",
				id: "topCenter",
			});
		});

		it("snaps to rightCenter just outside the right edge", () => {
			expect(calcNearestAnchor(frame, 126, 100)).toEqual({
				kind: "connectPoint",
				id: "rightCenter",
			});
		});

		it("snaps to bottomCenter just outside the bottom edge", () => {
			expect(calcNearestAnchor(frame, 100, 118)).toEqual({
				kind: "connectPoint",
				id: "bottomCenter",
			});
		});

		it("snaps to leftCenter just outside the left edge", () => {
			expect(calcNearestAnchor(frame, 74, 100)).toEqual({
				kind: "connectPoint",
				id: "leftCenter",
			});
		});

		it("does not snap to an edge midpoint further away than the snap radius", () => {
			// 40px along the top edge from topCenter (100,150) on the roomy frame.
			expect(calcNearestAnchor(roomyFrame, 140, 150)).toEqual({
				kind: "edge",
				side: "top",
				t: 0.2,
			});
		});

		it("measures the snap radius in screen px, so a zoomed-in view snaps from further out in world units", () => {
			// 20 world px above the top edge is 10 screen px at zoom 0.5: within the radius.
			expect(
				calcNearestAnchor(roomyFrame, 200, 130, undefined, { zoom: 0.5 }),
			).toEqual({ kind: "connectPoint", id: "topCenter" });
			expect(
				calcNearestAnchor(roomyFrame, 200, 130, undefined, { zoom: 1 }),
			).toEqual({ kind: "edge", side: "top", t: 0.5 });
		});

		it("judges the edge midpoints where the anchor region puts them, not on the bounding box", () => {
			// A region covering only the left half moves topCenter to x=150 (world).
			expect(
				calcNearestAnchor(roomyFrame, 150, 150, undefined, {
					anchorRegion: { x: -100, y: -50, width: 100, height: 100 },
				}),
			).toEqual({ kind: "connectPoint", id: "topCenter" });
		});
	});

	describe("center for a cursor deep inside", () => {
		it("returns center well inside the shape", () => {
			expect(calcNearestAnchor(roomyFrame, 200, 200)).toEqual({
				kind: "center",
			});
		});

		it("returns an edge position just inside the boundary", () => {
			// 10px above the bottom edge: shallower than CENTER_ANCHOR_DEPTH_PX.
			expect(calcNearestAnchor(roomyFrame, 260, 240)).toEqual({
				kind: "edge",
				side: "bottom",
				t: 0.8,
			});
		});

		it("measures the depth against the outline rather than the bounding box", () => {
			// An outline that tapers toward the top: (240,200) is under 10px inside the
			// drawn edge though it is 50px inside the bounding box.
			const flatTopped: Point[] = [
				{ x: -10, y: -10 },
				{ x: 10, y: -10 },
				{ x: 100, y: 0 },
				{ x: 10, y: 50 },
				{ x: -10, y: 50 },
				{ x: -100, y: 0 },
			];
			expect(
				calcNearestAnchor(roomyFrame, 240, 200, undefined, {
					outline: flatTopped,
				}),
			).toEqual({ kind: "edge", side: "top", t: 0.7 });
			expect(calcNearestAnchor(roomyFrame, 240, 200)).toEqual({
				kind: "center",
			});
		});
	});

	describe("free position along an edge", () => {
		it("rounds to the nearest side and its ratio along it", () => {
			expect(calcNearestAnchor(roomyFrame, 160, 155)).toEqual({
				kind: "edge",
				side: "top",
				t: 0.3,
			});
			expect(calcNearestAnchor(roomyFrame, 295, 175)).toEqual({
				kind: "edge",
				side: "right",
				t: 0.25,
			});
		});

		it("measures the ratio in local space, so a rotated shape keeps the same side", () => {
			const rotated = { ...roomyFrame, rotation: 90 };
			// Local (-60, -50) — 20% along the top edge — is world (250, 140) at 90°.
			expect(calcNearestAnchor(rotated, 250, 140)).toEqual({
				kind: "edge",
				side: "top",
				t: 0.2,
			});
		});

		it("keeps the local side under a flip, so the anchor stays on the same material", () => {
			const flipped = { ...roomyFrame, scaleX: -1 };
			// Local (-60, -50) mirrors to world (260, 150).
			expect(calcNearestAnchor(flipped, 260, 150)).toEqual({
				kind: "edge",
				side: "top",
				t: 0.2,
			});
		});

		it("spreads the ratio over the anchor region when one is registered", () => {
			// Region = the left half (world x 100..200), so world x=180 is 0.8 along it
			// where the bounding box would call it 0.4.
			expect(
				calcNearestAnchor(roomyFrame, 180, 155, undefined, {
					anchorRegion: { x: -100, y: -50, width: 100, height: 100 },
				}),
			).toEqual({ kind: "edge", side: "top", t: 0.8 });
			expect(calcNearestAnchor(roomyFrame, 180, 155)).toEqual({
				kind: "edge",
				side: "top",
				t: 0.4,
			});
		});
	});

	describe("exclude (candidate exclusion for self-loops)", () => {
		it("picks an edge midpoint even on the center when center is excluded", () => {
			const result = calcNearestAnchor(frame, 100, 100, { center: true });
			expect(result.kind).toBe("connectPoint");
		});

		it("never falls back to center deep inside when center is excluded", () => {
			expect(
				calcNearestAnchor(roomyFrame, 200, 200, { center: true }).kind,
			).toBe("edge");
		});

		it("does not select an edge midpoint whose connectPoint is excluded", () => {
			const result = calcNearestAnchor(frame, 100, 112, {
				center: true,
				connectPointId: "bottomCenter",
			});
			if (result.kind === "connectPoint") {
				expect(result.id).not.toBe("bottomCenter");
			}
		});

		it("pushes a free position clear of the edge anchor the fixed end holds", () => {
			// The cursor rounds to bottom / 0.8 on its own, exactly where the fixed end is.
			expect(calcNearestAnchor(roomyFrame, 260, 245)).toEqual({
				kind: "edge",
				side: "bottom",
				t: 0.8,
			});
			expect(
				calcNearestAnchor(roomyFrame, 260, 245, {
					center: true,
					edge: { kind: "edge", side: "bottom", t: 0.8 },
				}),
			).toEqual({ kind: "edge", side: "bottom", t: 0.85 });
		});

		it("turns the push around when it would run past the end of the edge", () => {
			// Rounds to bottom / 0.99, and pushing further along would leave the edge.
			expect(
				calcNearestAnchor(roomyFrame, 298, 249.5, {
					center: true,
					edge: { kind: "edge", side: "bottom", t: 0.97 },
				}),
			).toEqual({ kind: "edge", side: "bottom", t: 0.92 });
		});

		it("leaves a free position on another side untouched", () => {
			const result = calcNearestAnchor(roomyFrame, 260, 155, {
				center: true,
				edge: { kind: "edge", side: "bottom", t: 0.8 },
			});
			expect(result).toEqual({ kind: "edge", side: "top", t: 0.8 });
		});
	});

	describe("extra connect points", () => {
		// Local (-20, -5) on this frame is world (80, 95): just above leftCenter.
		const tip: ExtraConnectPoint = {
			id: "tip",
			point: { x: -20, y: -5 },
			direction: { x: -1, y: 0 },
		};

		it("wins when the cursor is nearest to it", () => {
			expect(
				calcNearestAnchor(frame, 74, 95, undefined, {
					extraConnectPoints: [tip],
				}),
			).toEqual({ kind: "connectPoint", id: "tip" });
		});

		it("does not displace an edge midpoint the cursor is clearly nearer to", () => {
			expect(
				calcNearestAnchor(frame, 100, 118, undefined, {
					extraConnectPoints: [tip],
				}),
			).toEqual({ kind: "connectPoint", id: "bottomCenter" });
		});

		it("wins over an edge midpoint sitting on the very same point", () => {
			// Local (-20, 0) is world (80, 100) — exactly leftCenter.
			const coincident: ExtraConnectPoint = {
				id: "tip",
				point: { x: -20, y: 0 },
				direction: { x: -1, y: 0 },
			};
			expect(
				calcNearestAnchor(frame, 78, 100, undefined, {
					extraConnectPoints: [coincident],
				}),
			).toEqual({ kind: "connectPoint", id: "tip" });
		});

		it("is excluded like any other connectPoint on a self-loop", () => {
			const result = calcNearestAnchor(
				frame,
				74,
				95,
				{ center: true, connectPointId: "tip" },
				{ extraConnectPoints: [tip] },
			);
			expect(result).toEqual({ kind: "connectPoint", id: "leftCenter" });
		});
	});
});
