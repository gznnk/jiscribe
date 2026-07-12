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

	it("a forced wrap keeps full-margin clearance from both shapes as one is dragged (no dip into the margin)", () => {
		// Two vertically-stacked boxes connected on their FAR sides (source.bottom → target.top): both
		// stubs point away from each other, forcing the route to wrap around one side. As the top box is
		// dragged right, the wrap column must stay at the leftmost box's left edge minus the full margin
		// — not graze within the other box's margin and then snap back out (the reported jitter).
		const margin = 30;
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 231, y: 470 }, // bottom-edge center, exits down
			direction: "down",
			box: boxAt(231, 420, 100, 100), // left edge = 181
		};
		const sourceLeft = 181;
		for (let dx = 0; dx <= 70; dx += 5) {
			const target: OrthogonalConnectorEndpoint = {
				point: { x: 231 + dx, y: 164 }, // top-edge center, exits up
				direction: "up",
				box: boxAt(231 + dx, 214, 100, 100),
			};
			const path = routeOrthogonalConnector(source, target);
			// leftmost vertical (wrap) column
			const wrapX = Math.min(
				...path.flatMap((p, i) =>
					i < path.length - 1 && p.x === path[i + 1].x ? [p.x] : [],
				),
			);
			// the wrap goes around the left → its clearance from the source's left edge is exactly the margin
			expect(sourceLeft - wrapX).toBe(margin);
		}
	});

	it("parallel left-exits on x-overlapping, y-stacked boxes make a clean C (no staircase around the exit corridor)", () => {
		// Both endpoints exit left; the boxes overlap in x and are stacked in y. A clamped stub can land
		// inside the other box's margin band, but the margin-intrusion cost excludes each endpoint's own
		// exit corridor, so the clean route wins instead of an ugly staircase. Expect a clean 4-point C.
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 1278, y: 753 },
			direction: "left",
			box: boxAt(1328, 753, 100, 100), // x[1278,1378]
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 1251, y: 547 },
			direction: "left",
			box: boxAt(1301, 547, 100, 100), // x[1251,1351], overlaps source in x
		};
		const path = routeOrthogonalConnector(source, target);
		expect(path).toHaveLength(4);
		expect(countReversals(path)).toBe(0);
		// the single vertical run clears both boxes on the left (at the target's left margin)
		expect(path[1].x).toBe(path[2].x);
	});

	it("routing past a shape keeps full-margin clearance as the near endpoint is dragged toward it (no dip-and-restore)", () => {
		// Both endpoints exit left, source to the right of the target. As the source box is dragged up
		// toward the target, the pass-by segment must never come closer than the margin to the target
		// and then snap back out — the clearance must stay >= margin throughout (it detours to hold it).
		const margin = 30;
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 1583, y: 557 },
			direction: "left",
			box: boxAt(1633, 557, 100, 100), // y-span [507, 607]
		};
		const targetTop = 507;
		const targetBottom = 607;
		for (let sourceCy = 700; sourceCy >= 460; sourceCy -= 5) {
			const source: OrthogonalConnectorEndpoint = {
				point: { x: 1775, y: sourceCy },
				direction: "left",
				box: boxAt(1825, sourceCy, 100, 100),
			};
			const path = routeOrthogonalConnector(source, target);
			// every horizontal segment that spans the target's x-band must clear it vertically by the margin
			for (let i = 0; i < path.length - 1; i++) {
				const a = path[i];
				const b = path[i + 1];
				if (a.y !== b.y) {
					continue;
				}
				const spansTarget =
					Math.min(a.x, b.x) < 1683 && Math.max(a.x, b.x) > 1583;
				if (!spansTarget) {
					continue;
				}
				const clearance =
					a.y <= targetTop
						? targetTop - a.y
						: a.y >= targetBottom
							? a.y - targetBottom
							: -1; // inside the span → would cross; must not happen for a pass-by
				expect(clearance).toBeGreaterThanOrEqual(margin);
			}
		}
	});

	it("a forced detour hugs the near edge of the shape it goes around (no over-detour past both boxes)", () => {
		// Both endpoints exit left, source to the right of target, and the source's exit y sits inside
		// the target's vertical span (so a straight left run would cross the target). The route must
		// detour around the target — and the crossover should clear the target's *near* edge by the
		// margin, not the far envelope of both boxes.
		const margin = 30;
		// target: left edge 1583, y-span [507, 607]
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 1583, y: 557 },
			direction: "left",
			box: boxAt(1633, 557, 100, 100),
		};
		// source exit y = 589, in the LOWER half of the target span → detour around the bottom
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 1775, y: 589 },
			direction: "left",
			box: boxAt(1825, 589, 100, 100), // bottom edge 639
		};
		const path = routeOrthogonalConnector(source, target);
		const crossingY = Math.max(...path.map((p) => p.y));
		// clears the target's bottom (607) by the margin; must NOT sink to the source-inclusive envelope (639+margin)
		expect(crossingY).toBe(607 + margin);
	});

	it("a forced detour goes around the near side (up when the exit is near the top, down when near the bottom)", () => {
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 1583, y: 557 },
			direction: "left",
			box: boxAt(1633, 557, 100, 100), // y-span [507, 607], center 557
		};
		const routeFor = (sourceCy: number) =>
			routeOrthogonalConnector(
				{
					point: { x: 1775, y: sourceCy },
					direction: "left",
					box: boxAt(1825, sourceCy, 100, 100),
				},
				target,
			);
		// exit near the top of the span → detour over the top (crossing above the target)
		const nearTop = routeFor(520);
		expect(Math.min(...nearTop.map((p) => p.y))).toBeLessThan(507);
		// exit near the bottom of the span → detour under the bottom (crossing below the target)
		const nearBottom = routeFor(595);
		expect(Math.max(...nearBottom.map((p) => p.y))).toBeGreaterThan(607);
	});

	it("a wrap alongside a shape keeps full-margin clearance as the far endpoint's box is dragged past it", () => {
		// source.top (exits up) → target.right (exits right), with the two boxes overlapping in x so the
		// descent runs alongside the source box. As the target box is dragged right, the descent column
		// must stay at least the full margin clear of the source's right edge — not graze within its
		// margin (the target-stub column) and then snap back out.
		const margin = 30;
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 134, y: 268 }, // top-edge center, exits up
			direction: "up",
			box: boxAt(134, 318, 100, 100), // right edge = 184
		};
		const sourceRight = 184;
		for (let cx = 64; cx <= 204; cx += 5) {
			const target: OrthogonalConnectorEndpoint = {
				point: { x: cx + 50, y: 485 }, // right-edge center, exits right
				direction: "right",
				box: boxAt(cx, 485, 100, 100),
			};
			const path = routeOrthogonalConnector(source, target);
			const descentX = path.flatMap((p, i) =>
				i < path.length - 1 && p.x === path[i + 1].x ? [p.x] : [],
			);
			// every vertical run that passes the source on its right must clear it by the full margin
			for (const x of descentX) {
				if (x > sourceRight) {
					expect(x - sourceRight).toBeGreaterThanOrEqual(margin);
				}
			}
		}
	});

	it("a non-facing S (top edge → left edge) jogs at the center between the shapes, not a shape's margin", () => {
		// source exits up, target exits left: not facing, so the route is an S with a vertical jog.
		// The jog must sit at the center of the gap between the two boxes (source.right / target.left),
		// not hug source.right + margin.
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 673, y: 518 }, // top-edge center, exits up
			direction: "up",
			box: boxAt(673, 568, 100, 100), // x: [623, 723]
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 921, y: 568 }, // left-edge center, exits left
			direction: "left",
			box: boxAt(971, 568, 100, 100), // x: [921, 1021]
		};
		const path = routeOrthogonalConnector(source, target);
		const jog = path.find((p, i) => i > 0 && p.x === path[i + 1]?.x);
		// center of the gap between source.right (723) and target.left (921) = 822
		expect(jog?.x).toBe(822);
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

	describe("route stability under cost ties (total order)", () => {
		// Target behind the source's exit direction: the route must wrap around, and for
		// equal-sized boxes wrapping over the top vs. under the bottom has the exact same
		// Manhattan cost for every vertical offset (the constraining box swaps roles). The tie
		// must be broken by a key intrinsic to the route's shape — if it fell back to candidate
		// enumeration order, the winner would flip arbitrarily while the owner is dragged,
		// because the enumerated channel set shifts with the boxes.
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

		it("the topology stays fixed while the owner is dragged through the tie window", () => {
			// Drag the target vertically across the source's midline (the whole window is a tie).
			const signatures = new Set<string>();
			for (let targetCy = 20; targetCy <= 80; targetCy += 1) {
				const { source, target } = wrapAroundEndpoints(targetCy);
				signatures.add(
					calcPathSignature(routeOrthogonalConnector(source, target)),
				);
			}
			expect(signatures.size).toBe(1);
		});

		it("1px jitter on the symmetric midline does not flip the topology", () => {
			// Hand tremor while hovering exactly at the symmetric configuration: the tie-breaking
			// convention is constant, so the topology must not oscillate.
			const jittered = [50, 51, 50, 49, 50, 51].map((targetCy) => {
				const { source, target } = wrapAroundEndpoints(targetCy);
				return calcPathSignature(routeOrthogonalConnector(source, target));
			});
			expect(new Set(jittered).size).toBe(1);
		});

		it("the pick is deterministic: the same geometry always yields the same path", () => {
			const { source, target } = wrapAroundEndpoints(30);
			const first = routeOrthogonalConnector(source, target);
			const second = routeOrthogonalConnector(source, target);
			expect(second).toEqual(first);
		});
	});
});
