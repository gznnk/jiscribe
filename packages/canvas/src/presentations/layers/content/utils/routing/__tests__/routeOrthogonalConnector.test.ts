import {
	calcFrameBoxFeatures,
	isLineIntersectingBox,
	type BoxFeatures,
} from "@workspace/geometry";
import { describe, it, expect } from "vitest";

import { routeOrthogonalConnector, type OrthogonalConnectorEndpoint } from "..";
import { calcPathSignature } from "../pathSignature";

/** Creates an axis-aligned box centered at (cx,cy) with the given width and height. */
const boxAt = (cx: number, cy: number, w = 100, h = 60): BoxFeatures =>
	calcFrameBoxFeatures({
		cx,
		cy,
		width: w,
		height: h,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	});

const allSegmentsOrthogonal = (points: { x: number; y: number }[]): boolean =>
	points.every((p, i) =>
		i === 0 ? true : p.x === points[i - 1].x || p.y === points[i - 1].y,
	);

/** The number of reversals (backtracking spikes) where the travel direction flips along the same axis. */
const countReversals = (points: { x: number; y: number }[]): number => {
	let reversals = 0;
	for (let i = 1; i < points.length - 1; i++) {
		const a = points[i - 1];
		const b = points[i];
		const c = points[i + 1];
		const reverseH =
			a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) < 0;
		const reverseV =
			a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) < 0;
		if (reverseH || reverseV) {
			reversals++;
		}
	}
	return reversals;
};

describe("routeOrthogonalConnector", () => {
	it("the full path includes the endpoints and every segment is horizontal/vertical", () => {
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 }, // right-edge center of box
			direction: "right",
			box: boxAt(100, 100),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 450, y: 300 }, // left-edge center of box
			direction: "left",
			box: boxAt(500, 300),
		};
		const path = routeOrthogonalConnector(source, target);
		expect(path[0]).toEqual({ x: 150, y: 100 });
		expect(path[path.length - 1]).toEqual({ x: 450, y: 300 });
		expect(allSegmentsOrthogonal(path)).toBe(true);
		expect(path.length).toBeGreaterThanOrEqual(2);
	});

	it("a horizontally aligned left-right connection produces a step-free route (minimal bends)", () => {
		// same y, right edge → left edge. Ideally the stubs collapse into a straight line.
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 200 },
			direction: "right",
			box: boxAt(100, 200),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 450, y: 200 },
			direction: "left",
			box: boxAt(500, 200),
		};
		const path = routeOrthogonalConnector(source, target);
		// y is constant (zero bends)
		expect(path.every((p) => p.y === 200)).toBe(true);
		expect(path).toEqual([
			{ x: 150, y: 200 },
			{ x: 450, y: 200 },
		]);
	});

	it("the route does not pass through either shape", () => {
		const sourceBox = boxAt(100, 100);
		const targetBox = boxAt(300, 260);
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 100, y: 130 }, // bottom-edge center
			direction: "down",
			box: sourceBox,
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 250, y: 260 }, // left-edge center
			direction: "left",
			box: targetBox,
		};
		const path = routeOrthogonalConnector(source, target);
		// intermediate segments (excluding the end stub legs) do not pass through the box
		for (let i = 1; i < path.length - 2; i++) {
			expect(isLineIntersectingBox(path[i], path[i + 1], sourceBox)).toBe(
				false,
			);
			expect(isLineIntersectingBox(path[i], path[i + 1], targetBox)).toBe(
				false,
			);
		}
	});

	it("a free endpoint (box=null) connects from that point without emitting a stub", () => {
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 },
			direction: "right",
			box: boxAt(100, 100),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 400, y: 250 },
			direction: "left",
			box: null,
		};
		const path = routeOrthogonalConnector(source, target);
		expect(path[path.length - 1]).toEqual({ x: 400, y: 250 });
		expect(allSegmentsOrthogonal(path)).toBe(true);
	});

	it("respects the exit direction (a rightward anchor exits right before turning)", () => {
		// target is directly below source, an arrangement that naively tends to backtrack left.
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 }, // right-edge center
			direction: "right",
			box: boxAt(100, 100),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 100, y: 270 }, // top-edge center
			direction: "up",
			box: boxAt(100, 300),
		};
		const path = routeOrthogonalConnector(source, target);
		// the first step from source goes rightward (+x)
		expect(path[1].x).toBeGreaterThan(path[0].x);
		expect(path[1].y).toBe(path[0].y);
	});

	it("does not cut into a shape even when a detour is required (does not pass through the box)", () => {
		// there is a large target box to the right of source, and entering its "right edge" requires a detour.
		// with only fixed stubs, this is a case that would slice through the box.
		const sourceBox = boxAt(120, 200, 100, 60);
		const targetBox = boxAt(300, 200, 120, 160);
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 170, y: 200 }, // right-edge center
			direction: "right",
			box: sourceBox,
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 360, y: 200 }, // right-edge center (entered via detour)
			direction: "right",
			box: targetBox,
		};
		const path = routeOrthogonalConnector(source, target);
		expect(allSegmentsOrthogonal(path)).toBe(true);
		// every segment except the end stub legs passes through neither box
		for (let i = 1; i < path.length - 2; i++) {
			expect(isLineIntersectingBox(path[i], path[i + 1], sourceBox)).toBe(
				false,
			);
			expect(isLineIntersectingBox(path[i], path[i + 1], targetBox)).toBe(
				false,
			);
		}
	});

	it("does not cut into the AABB after exiting even when the face center is inside the AABB (rotated shape)", () => {
		// for a rotated shape, the face center falls inside the bounding box.
		// point.x(170) < AABB right edge(200). With a fixed 20px, the stub x=190 stays inside the AABB,
		// and the upward vertical segment passes through the AABB. Based on the AABB edge, x=220 exits outside.
		const box = boxAt(100, 100, 200, 200); // AABB: x[0,200], y[0,200]
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 170, y: 100 },
			direction: "right",
			box,
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 250, y: 0 }, // left edge of the top-right box (arrangement that exits right then turns up)
			direction: "left",
			box: boxAt(300, 0, 100, 60),
		};
		const path = routeOrthogonalConnector(source, target);
		// apart from the exit leg (first segment), nothing passes through source's AABB
		for (let i = 1; i < path.length - 1; i++) {
			expect(isLineIntersectingBox(path[i], path[i + 1], box)).toBe(false);
		}
	});

	it("facing left-right arrangement with a vertical offset bends at the midpoint into an S/Z shape", () => {
		// facing right edge → left edge with a y offset. A symmetric route bending at the midpoint, not a lopsided L.
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 170, y: 130 },
			direction: "right",
			box: boxAt(120, 130, 100, 60),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 310, y: 270 },
			direction: "left",
			box: boxAt(360, 270, 100, 60),
		};
		const path = routeOrthogonalConnector(source, target);
		// S shape: source → (jogX, sy) → (jogX, ty) → target
		expect(path).toHaveLength(4);
		expect(path[1].x).toBe(path[2].x); // central vertical jog
		// the jog x is roughly the midpoint of the two ends (a lopsided L would be near an end)
		const mid = (path[0].x + path[3].x) / 2;
		expect(Math.abs(path[1].x - mid)).toBeLessThanOrEqual(20);
	});

	it("facing top-bottom arrangement with a horizontal offset also bends at the midpoint into an S/Z shape", () => {
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 130, y: 150 },
			direction: "down",
			box: boxAt(130, 120, 90, 60),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 320, y: 290 },
			direction: "up",
			box: boxAt(320, 320, 90, 60),
		};
		const path = routeOrthogonalConnector(source, target);
		expect(path).toHaveLength(4);
		expect(path[1].y).toBe(path[2].y); // central horizontal jog
		const mid = (path[0].y + path[3].y) / 2;
		expect(Math.abs(path[1].y - mid)).toBeLessThanOrEqual(20);
	});

	it("right edge → top edge (top-left → bottom-right diagonal arrangement) forms a 2-segment, 1-corner L shape", () => {
		// exit (right) and entry (up) mesh. It should be a plain L, not a staircase (3 corners).
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 }, // right-edge center of the top-left box
			direction: "right",
			box: boxAt(100, 100, 100, 60),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 320, y: 230 }, // top-edge center of the bottom-right box
			direction: "up",
			box: boxAt(320, 260, 100, 60),
		};
		const path = routeOrthogonalConnector(source, target);
		// one corner (three points). Goes right, then turns down.
		expect(path).toEqual([
			{ x: 150, y: 100 },
			{ x: 320, y: 100 },
			{ x: 320, y: 230 },
		]);
	});

	it("detours to an endpoint behind the exit direction without backtracking the stub (#77 reversal-spike avoidance)", () => {
		// source exits right but target is behind and to the left. Naively, this arrangement tends to
		// produce a spike that goes 20 right and then backtracks along the same segment.
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 }, // right-edge center → exits right
			direction: "right",
			box: boxAt(100, 100),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 0 }, // left-edge center. Behind source, to the left and above
			direction: "left",
			box: boxAt(200, 0),
		};
		const path = routeOrthogonalConnector(source, target);
		expect(allSegmentsOrthogonal(path)).toBe(true);
		// no reversal (backtracking spike)
		expect(countReversals(path)).toBe(0);
		// source's first step goes straight right for the stub length (no bend partway)
		expect(path[1].y).toBe(path[0].y);
		expect(path[1].x).toBeGreaterThan(path[0].x);
	});

	it("a close, facing, aligned arrangement becomes a straight line without detouring (gap < margin×2)", () => {
		// gap=40 (< margin×2=60). With full margin the stubs overshoot each other,
		// an arrangement that tends to loop around the top or bottom. Shorten the stubs and collapse to a straight line.
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 200 }, // right-edge center
			direction: "right",
			box: boxAt(100, 200),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 190, y: 200 }, // left-edge center (gap=40)
			direction: "left",
			box: boxAt(240, 200),
		};
		const path = routeOrthogonalConnector(source, target);
		expect(path).toEqual([
			{ x: 150, y: 200 },
			{ x: 190, y: 200 },
		]);
	});

	it("a close, facing, vertically offset arrangement becomes a Z that bends once in the middle (no detour)", () => {
		// gap=40, y offset of 60. Rather than a detour (multiple bends + reversal), it becomes a
		// plain Z bending at the center of the gap (4 points, zero reversals).
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 200 },
			direction: "right",
			box: boxAt(100, 200),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 190, y: 260 },
			direction: "left",
			box: boxAt(240, 260),
		};
		const path = routeOrthogonalConnector(source, target);
		expect(path).toHaveLength(4);
		expect(path[1].x).toBe(path[2].x); // vertical jog at the center of the gap
		expect(path[1].x).toBe(170); // midpoint of 150 and 190
		expect(countReversals(path)).toBe(0);
		expect(allSegmentsOrthogonal(path)).toBe(true);
	});

	it("changing margin changes how far the stub is pushed out", () => {
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 },
			direction: "right",
			box: boxAt(100, 100),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 400 }, // directly below (vertical offset). Forms an L shape.
			direction: "left",
			box: boxAt(200, 400),
		};
		const path = routeOrthogonalConnector(source, target, { margin: 40 });
		// passes through x=190, source pushed 40 to the right
		expect(path.some((p) => p.x === 190)).toBe(true);
	});

	describe("hysteresis (previousPathSignature)", () => {
		// Target behind the source's exit direction: the route must wrap around, and wrapping over
		// the top vs. under the bottom has the exact same Manhattan cost. A memoryless pick flips
		// arbitrarily as the boxes move; the previous frame's topology must win the tie.
		const wrapAroundEndpoints = (targetCy: number) => {
			const source: OrthogonalConnectorEndpoint = {
				point: { x: 100, y: 50 }, // right-edge center
				direction: "right",
				box: boxAt(50, 50, 100, 100),
			};
			const target: OrthogonalConnectorEndpoint = {
				point: { x: -300, y: targetCy }, // left-edge center, behind the source
				direction: "left",
				box: boxAt(-250, targetCy, 100, 100),
			};
			return { source, target };
		};

		it("a cost-tied wrap-around keeps the previous topology (both directions)", () => {
			const { source, target } = wrapAroundEndpoints(30);
			const overTop = routeOrthogonalConnector(source, target, {
				previousPathSignature: "RULDR",
			});
			const underBottom = routeOrthogonalConnector(source, target, {
				previousPathSignature: "RDLUR",
			});
			expect(calcPathSignature(overTop)).toBe("RULDR");
			expect(calcPathSignature(underBottom)).toBe("RDLUR");
		});

		it("the topology stays fixed while the owner is dragged through the tie window", () => {
			// Drag the target vertically across the source's midline. Without memory the winner
			// flips several times in this window; with memory it must never change.
			let previousPathSignature: string | null = null;
			const signatures = new Set<string>();
			for (let targetCy = 20; targetCy <= 80; targetCy += 5) {
				const { source, target } = wrapAroundEndpoints(targetCy);
				const path = routeOrthogonalConnector(source, target, {
					previousPathSignature,
				});
				previousPathSignature = calcPathSignature(path);
				signatures.add(previousPathSignature);
			}
			expect(signatures.size).toBe(1);
		});

		it("a clearly better route (fewer turns) still wins over the previous topology", () => {
			// Horizontally aligned facing boxes: a straight line is possible. Even if the previous
			// frame drew an S shape, the 2-turn advantage exceeds the hysteresis bonus.
			const source: OrthogonalConnectorEndpoint = {
				point: { x: 150, y: 200 },
				direction: "right",
				box: boxAt(100, 200),
			};
			const target: OrthogonalConnectorEndpoint = {
				point: { x: 450, y: 200 },
				direction: "left",
				box: boxAt(500, 200),
			};
			const path = routeOrthogonalConnector(source, target, {
				previousPathSignature: "RDR",
			});
			expect(calcPathSignature(path)).toBe("R");
		});
	});
});
