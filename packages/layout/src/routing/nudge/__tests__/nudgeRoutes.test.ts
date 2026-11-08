import type { BoundingBox, Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { type RouteEnd, type RouteToNudge, nudgeRoutes } from "../nudgeRoutes";

let endCount = 0;

/**
 * A route whose ends, unless `ends` says otherwise, each sit on a side of their own
 * and may not slide off where they stand.
 */
const route = (
	points: readonly (readonly [number, number])[],
	walls: readonly BoundingBox[] = [],
	ends: { source?: Partial<RouteEnd>; target?: Partial<RouteEnd> } = {},
): RouteToNudge => {
	const path = points.map(([x, y]) => ({ x, y }));
	const toEnd = (
		at: number,
		next: number,
		given: Partial<RouteEnd> | undefined,
	): RouteEnd => {
		const across = path[at].x === path[next].x ? path[at].x : path[at].y;
		endCount += 1;
		return {
			sideKey: `end-${endCount}`,
			slide: { min: across, max: across },
			ownWallIndices: [],
			...given,
		};
	};
	return {
		path,
		walls,
		source: toEnd(0, 1, ends.source),
		target: toEnd(path.length - 1, path.length - 2, ends.target),
	};
};

/** A route of `points`, or of them reversed with its two ends swapped when `isReversed`. */
const routeOneWay = (
	isReversed: boolean,
	points: readonly (readonly [number, number])[],
	walls: readonly BoundingBox[] = [],
	ends: { source?: Partial<RouteEnd>; target?: Partial<RouteEnd> } = {},
): RouteToNudge =>
	isReversed
		? route([...points].reverse(), walls, {
				source: ends.target,
				target: ends.source,
			})
		: route(points, walls, ends);

const toPairs = (path: readonly Point[]): [number, number][] =>
	path.map(({ x, y }) => [x, y]);

/**
 * Nudge the routes `build` gives twice, its first route given forward and then
 * reversed, and expect the same routes both times.
 *
 * @returns The routes nudged with the first given forward
 */
const nudgeBothWays = (
	build: (isReversed: boolean) => RouteToNudge[],
	borders: readonly BoundingBox[] = [],
): RouteToNudge[] => {
	const forward = build(false);
	const reversed = build(true);

	nudgeRoutes(forward, borders);
	nudgeRoutes(reversed, borders);

	expect(toPairs(reversed[0].path).reverse()).toEqual(toPairs(forward[0].path));
	expect(reversed.slice(1).map(({ path }) => path)).toEqual(
		forward.slice(1).map(({ path }) => path),
	);
	return forward;
};

/** Pairs of segments of different routes that cross at a point inside both. */
const countCrossings = (routes: readonly RouteToNudge[]): number => {
	const segmentsOf = (path: readonly Point[]) =>
		path.slice(1).map((point, index) => [path[index], point] as const);
	let crossings = 0;
	routes.forEach(({ path }, routeIndex) => {
		for (const other of routes.slice(routeIndex + 1)) {
			for (const [a, b] of segmentsOf(path)) {
				for (const [c, d] of segmentsOf(other.path)) {
					if ((a.x === b.x) === (c.x === d.x)) {
						continue;
					}
					const [vertical, horizontal] =
						a.x === b.x
							? [
									[a, b],
									[c, d],
								]
							: [
									[c, d],
									[a, b],
								];
					const x = vertical[0].x;
					const y = horizontal[0].y;
					if (
						Math.min(horizontal[0].x, horizontal[1].x) < x &&
						x < Math.max(horizontal[0].x, horizontal[1].x) &&
						Math.min(vertical[0].y, vertical[1].y) < y &&
						y < Math.max(vertical[0].y, vertical[1].y)
					) {
						crossings += 1;
					}
				}
			}
		}
	});
	return crossings;
};

describe("nudgeRoutes", () => {
	it("nests routes sharing a path through two bends, the inner one turning first", () => {
		// Both run down x 50, right along y 100 and down x 250; `inner` leaves the
		// path first at each end. A box below the run along y 100 keeps either of its
		// steps from being straightened.
		const walls = [{ left: 140, top: 130, right: 160, bottom: 170 }];
		const inner = route(
			[
				[100, 0],
				[50, 0],
				[50, 100],
				[250, 100],
				[250, 200],
				[300, 200],
			],
			walls,
		);
		const outer = route(
			[
				[0, -30],
				[50, -30],
				[50, 100],
				[250, 100],
				[250, 250],
				[300, 250],
			],
			walls,
		);

		nudgeRoutes([inner, outer], []);

		expect(toPairs(inner.path)).toEqual([
			[100, 0],
			[58, 0],
			[58, 92],
			[258, 92],
			[258, 200],
			[300, 200],
		]);
		expect(toPairs(outer.path)).toEqual([
			[0, -30],
			[42, -30],
			[42, 108],
			[242, 108],
			[242, 250],
			[300, 250],
		]);
		expect(countCrossings([inner, outer])).toBe(0);
	});

	it("puts two routes turning away from each other each on its own side, uncrossing them", () => {
		const fromLeft = route([
			[0, 0],
			[105, 0],
			[105, 200],
			[0, 200],
		]);
		const fromRight = route([
			[300, 10],
			[100, 10],
			[100, 190],
			[300, 190],
		]);
		expect(countCrossings([fromLeft, fromRight])).toBe(2);

		nudgeRoutes([fromLeft, fromRight], []);

		expect(fromLeft.path[1].x).toBe(95);
		expect(fromRight.path[1].x).toBe(111);
		expect(countCrossings([fromLeft, fromRight])).toBe(0);
	});

	it("follows two runs turning together onward to where they part", () => {
		// Both run down x 100 and turn left along y 0 together; `turnsFirst` turns up
		// again at x 30, before `turnsLater` at x 0, so it nests inside. Given first,
		// it would come first in the current order. A box inside the turns keeps
		// either step from being straightened.
		const walls = [{ left: 40, top: 50, right: 80, bottom: 150 }];
		const turnsFirst = route(
			[
				[30, -50],
				[30, 0],
				[100, 0],
				[100, 200],
				[310, 200],
			],
			walls,
		);
		const turnsLater = route(
			[
				[0, -50],
				[0, 0],
				[100, 0],
				[100, 200],
				[300, 200],
			],
			walls,
		);

		nudgeRoutes([turnsFirst, turnsLater], []);

		expect(toPairs(turnsFirst.path)).toEqual([
			[30, -50],
			[30, -8],
			[108, -8],
			[108, 200],
			[310, 200],
		]);
		expect(toPairs(turnsLater.path)).toEqual([
			[0, -50],
			[0, 8],
			[92, 8],
			[92, 200],
			[300, 200],
		]);
	});

	it("takes the order the far end of a shared stretch gives when the near end gives none", () => {
		// The stub's top is its route's end; at y 100 it turns right, before `passing`.
		const stub = route([
			[100, 0],
			[100, 100],
			[300, 100],
		]);
		const passing = route([
			[150, -60],
			[150, -20],
			[104, -20],
			[104, 150],
			[200, 150],
		]);

		nudgeRoutes([stub, passing], []);

		expect(passing.path[2].x).toBe(84);
		expect(toPairs(stub.path)).toEqual([
			[100, 0],
			[100, 100],
			[300, 100],
		]);
	});

	it("orders runs of two routes touching end to end by where each turns there", () => {
		// `fromAbove` ends at y 50 turning left, `fromBelow` starts there turning right.
		// A box inside each route's steps keeps them from being straightened.
		const fromAbove = route(
			[
				[150, -30],
				[150, 0],
				[104, 0],
				[104, 50],
				[0, 50],
			],
			[{ left: 115, top: 15, right: 140, bottom: 40 }],
		);
		const fromBelow = route(
			[
				[250, 20],
				[250, 50],
				[100, 50],
				[100, 100],
				[0, 100],
			],
			[{ left: 150, top: 65, right: 200, bottom: 85 }],
		);

		nudgeRoutes([fromAbove, fromBelow], []);

		expect(fromAbove.path[2].x).toBe(94);
		expect(fromBelow.path[2].x).toBe(110);
	});

	it("leaves two runs of one route touching end to end where they are", () => {
		// The run down x 100 ends at y 50, where the route's last run up x 104 ends.
		// Boxes inside its two steps keep them from being straightened.
		const spiral = route(
			[
				[0, -40],
				[0, 0],
				[100, 0],
				[100, 50],
				[-50, 50],
				[-50, 150],
				[104, 150],
				[104, 50],
			],
			[
				{ left: 20, top: 15, right: 80, bottom: 35 },
				{ left: 0, top: 80, right: 50, bottom: 120 },
			],
		);
		const before = toPairs(spiral.path);

		nudgeRoutes([spiral], []);

		expect(toPairs(spiral.path)).toEqual(before);
	});

	it("never folds the short run between two runs of one route spread round another", () => {
		// `straight` runs between the jog's two runs. `below` and `above` end between
		// the lines the two runs are spread to, y 50 and 57, so moving either onto the
		// other's would cross one.
		const jogging = route([
			[0, 100],
			[0, 50],
			[100, 50],
			[100, 70],
			[200, 70],
			[200, 100],
		]);
		const straight = route([
			[-50, 0],
			[-50, 60],
			[250, 60],
			[250, 100],
		]);
		const below = route([
			[50, 200],
			[50, 53],
		]);
		const above = route([
			[150, -100],
			[150, 54],
		]);

		nudgeRoutes([jogging, straight, below, above], []);

		const { path } = jogging;
		expect(path).toHaveLength(6);
		expect(path[3].y - path[2].y).toBeGreaterThanOrEqual(1);
		const keys = path.map(({ x, y }) => `${x},${y}`);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("squeezes the spacing in a narrow channel, keeping both runs inside it", () => {
		const walls = [
			{ left: 60, top: -100, right: 160, bottom: 40 },
			{ left: 60, top: 60, right: 160, bottom: 200 },
		];
		const lower = route(
			[
				[0, 0],
				[0, 50],
				[200, 50],
				[200, 100],
			],
			walls,
		);
		const upper = route(
			[
				[20, 0],
				[20, 50],
				[220, 50],
				[220, 100],
			],
			walls,
		);

		nudgeRoutes([lower, upper], []);

		// Half the spacing from each wall leaves 48..52.
		expect(upper.path[1].y).toBe(48);
		expect(lower.path[1].y).toBe(52);
	});

	it("keeps two runs as they stand when not even the narrowest spacing parts them", () => {
		const walls = [
			{ left: 60, top: -100, right: 160, bottom: 49 },
			{ left: 60, top: 51, right: 160, bottom: 200 },
		];
		const lower = route(
			[
				[0, 0],
				[0, 50],
				[200, 50],
				[200, 100],
			],
			walls,
		);
		const upper = route(
			[
				[20, 0],
				[20, 50],
				[220, 50],
				[220, 100],
			],
			walls,
		);

		nudgeRoutes([lower, upper], []);

		expect(lower.path[1].y).toBe(50);
		expect(upper.path[1].y).toBe(50);
	});

	it("keeps a conflict no spacing can part as it stands, and spreads the rest of its group in full", () => {
		// `stuck` runs between two routes' last segments 1px off either side, which
		// never move, and boxes leave it 50..52; `upper` and `lower` conflict with it
		// and with each other.
		const above = route([
			[100, 0],
			[100, 49],
			[300, 49],
		]);
		const below = route([
			[120, 0],
			[120, 51],
			[300, 51],
		]);
		const stuck = route(
			[
				[50, 0],
				[50, 50],
				[250, 50],
				[250, 150],
			],
			[
				{ left: 60, top: 0, right: 240, bottom: 47 },
				{ left: 60, top: 60, right: 240, bottom: 100 },
			],
		);
		const upper = route([
			[0, -100],
			[0, 40],
			[200, 40],
			[200, 150],
		]);
		const lower = route([
			[20, -100],
			[20, 40],
			[220, 40],
			[220, 150],
		]);

		nudgeRoutes([above, below, stuck, upper, lower], []);

		const runs = [49, 51, stuck.path[1].y, upper.path[1].y, lower.path[1].y];
		expect(stuck.path[1].y).toBe(50);
		expect(upper.path[1].y).not.toBe(lower.path[1].y);
		for (const moved of [upper.path[1].y, lower.path[1].y]) {
			for (const other of runs) {
				if (other !== moved) {
					expect(Math.abs(moved - other)).toBeGreaterThanOrEqual(16);
				}
			}
		}
	});

	it("keeps as it stands a conflict two pairs on from where its group stops fitting", () => {
		// `stuck` runs 1px above `held`, a route's last segment, and a box below keeps it
		// from passing `held`; `ceiling`, another last segment, runs the spacing above
		// `stuck`. The group stops fitting at `ceiling`, held by its pair with `stuck`,
		// which its conflict with `held` holds in turn.
		const ceiling = route([
			[0, 0],
			[0, 33],
			[300, 33],
		]);
		const held = route([
			[310, 0],
			[310, 50],
			[10, 50],
		]);
		const stuck = route(
			[
				[20, 0],
				[20, 49],
				[220, 49],
				[220, 150],
			],
			[{ left: 60, top: 57, right: 160, bottom: 200 }],
		);
		const spread = route([
			[40, 0],
			[40, 52],
			[240, 52],
			[240, 150],
		]);

		nudgeRoutes([ceiling, held, stuck, spread], []);

		expect(stuck.path[1].y).toBe(49);
		expect(spread.path[1].y).toBe(66);
	});

	it("moves no run toward a box it already runs nearer than half the spacing", () => {
		// 3px above the box's top: the lower run may not come any nearer.
		const walls = [{ left: 50, top: 53, right: 150, bottom: 100 }];
		const lower = route(
			[
				[0, 0],
				[0, 50],
				[200, 50],
				[200, 100],
			],
			walls,
		);
		const upper = route(
			[
				[20, 0],
				[20, 50],
				[220, 50],
				[220, 100],
			],
			walls,
		);

		nudgeRoutes([lower, upper], []);

		expect(lower.path[1].y).toBe(50);
		expect(upper.path[1].y).toBe(34);
	});

	it("stops a run half the spacing short of a box it moves toward", () => {
		const walls = [{ left: 50, top: 60, right: 150, bottom: 100 }];
		const lower = route(
			[
				[0, 0],
				[0, 50],
				[200, 50],
				[200, 100],
			],
			walls,
		);
		const upper = route(
			[
				[20, 0],
				[20, 50],
				[220, 50],
				[220, 100],
			],
			walls,
		);

		nudgeRoutes([lower, upper], []);

		expect(lower.path[1].y).toBe(52);
		expect(upper.path[1].y).toBe(36);
	});

	it("keeps the piece a move adds to a neighbour off the box beside it", () => {
		// Moving `outer` right past x 104 would stretch its top neighbour along the
		// box's bottom edge, 3px below it; the box lies beyond the run's own stretch.
		const walls = [{ left: 104, top: -50, right: 200, bottom: -3 }];
		const outer = route(
			[
				[0, 0],
				[100, 0],
				[100, 200],
				[0, 200],
			],
			walls,
		);
		const inner = route(
			[
				[0, 10],
				[100, 10],
				[100, 190],
				[0, 190],
			],
			walls,
		);

		nudgeRoutes([outer, inner], []);

		expect(outer.path[1].x).toBe(103);
		expect(inner.path[1].x).toBe(87);
	});

	it("moves no run across a border's side, and lets one lying on a side move off it", () => {
		const border = { left: 0, top: 60, right: 300, bottom: 300 };
		const onSide = route([
			[20, 0],
			[20, 60],
			[220, 60],
			[220, 100],
		]);
		const above = route([
			[0, 0],
			[0, 56],
			[200, 56],
			[200, 100],
		]);

		nudgeRoutes([above, onSide], [border]);

		// `above`, 4px off the side, may come no nearer; `onSide` turns in above it and
		// leaves the side upward.
		expect(above.path[1].y).toBe(56);
		expect(onSide.path[1].y).toBe(40);
	});

	it("keeps a stub whose slide holds only its position where it is", () => {
		// Only the two routes' stubs run together.
		const first = route([
			[0, 0],
			[0, 100],
			[100, 100],
		]);
		const second = route([
			[4, 0],
			[4, 100],
			[-100, 100],
		]);

		nudgeRoutes([first, second], []);

		expect(toPairs(first.path)).toEqual([
			[0, 0],
			[0, 100],
			[100, 100],
		]);
		expect(toPairs(second.path)).toEqual([
			[4, 0],
			[4, 100],
			[-100, 100],
		]);
	});

	it("moves a run beside a stub, the stub staying where it is", () => {
		const stubbed = route([
			[0, 0],
			[0, 100],
			[100, 100],
		]);
		const passing = route([
			[50, -50],
			[50, -20],
			[6, -20],
			[6, 80],
			[-50, 80],
		]);

		nudgeRoutes([stubbed, passing], []);

		expect(toPairs(stubbed.path)).toEqual([
			[0, 0],
			[0, 100],
			[100, 100],
		]);
		expect(Math.abs(passing.path[2].x)).toBeGreaterThanOrEqual(16);
		expect(passing.path[2].x).toBe(passing.path[3].x);
	});

	it("keeps half of a stub's length when the run beside it moves toward its box", () => {
		// Below them a box 5px off keeps both from moving down; the stubs are 20px long.
		const walls = [{ left: 50, top: 25, right: 150, bottom: 100 }];
		const lower = route(
			[
				[0, 0],
				[0, 20],
				[200, 20],
				[200, 100],
			],
			walls,
		);
		const upper = route(
			[
				[20, 0],
				[20, 20],
				[220, 20],
				[220, 100],
			],
			walls,
		);

		nudgeRoutes([lower, upper], []);

		expect(upper.path[1].y).toBe(10);
		expect(lower.path[1].y).toBe(20);
	});

	it("keeps the current order where the decided one does not fit", () => {
		// The turns would put `first` below; boxes 3px off keep `first` from moving down
		// and `second` from moving up.
		const first = route(
			[
				[0, 0],
				[0, 50],
				[200, 50],
				[200, 100],
			],
			[{ left: -50, top: 53, right: 10, bottom: 100 }],
		);
		const second = route(
			[
				[20, 0],
				[20, 50],
				[220, 50],
				[220, 100],
			],
			[{ left: 210, top: 0, right: 260, bottom: 47 }],
		);

		nudgeRoutes([first, second], []);

		expect(first.path[1].y).toBe(42);
		expect(second.path[1].y).toBe(58);
	});

	it("keeps a run the spacing off a pair spread toward it, on its own side", () => {
		const routes = [
			route([
				[0, 0],
				[0, 50],
				[200, 50],
				[200, 100],
			]),
			route([
				[20, 0],
				[20, 50],
				[220, 50],
				[220, 100],
			]),
			route([
				[40, 0],
				[40, 70],
				[240, 70],
				[240, 100],
			]),
		];

		nudgeRoutes(routes, []);

		const [firstY, secondY, thirdY] = routes.map(({ path }) => path[1].y);
		const sorted = [firstY, secondY, thirdY].sort((a, b) => a - b);
		expect(sorted[1] - sorted[0]).toBeGreaterThanOrEqual(16);
		expect(sorted[2] - sorted[1]).toBeGreaterThanOrEqual(16);
		expect(sorted[2]).toBe(thirdY);
	});

	it("keeps a group the spacing off where the group before it moved, not where it stood", () => {
		// Two coincident pairs 30px apart: spreading the first brings it 8px nearer the
		// second, which must then keep off its new place.
		const routes = [
			route([
				[0, 0],
				[0, 50],
				[200, 50],
				[200, 150],
			]),
			route([
				[20, 0],
				[20, 50],
				[220, 50],
				[220, 150],
			]),
			route([
				[40, 0],
				[40, 80],
				[240, 80],
				[240, 150],
			]),
			route([
				[60, 0],
				[60, 80],
				[260, 80],
				[260, 150],
			]),
		];

		nudgeRoutes(routes, []);

		expect(routes.map(({ path }) => path[1].y)).toEqual([58, 42, 90, 74]);
	});

	it("puts a moved run on a whole px and leaves one it does not move exactly where it was", () => {
		const walls = [{ left: 50, top: 53.25, right: 150, bottom: 100 }];
		const stays = route(
			[
				[0, 0],
				[0, 50.25],
				[200, 50.25],
				[200, 100],
			],
			walls,
		);
		const moves = route(
			[
				[20, 0],
				[20, 50.25],
				[220, 50.25],
				[220, 100],
			],
			walls,
		);

		nudgeRoutes([stays, moves], []);

		expect(stays.path[1].y).toBe(50.25);
		expect(Number.isInteger(moves.path[1].y)).toBe(true);
		expect(stays.path[1].y - moves.path[1].y).toBeGreaterThanOrEqual(16);
	});

	it("gives the same routes on every run and whatever order the walls come in", () => {
		const build = (isReversed: boolean): RouteToNudge[] => {
			const walls = [
				{ left: 60, top: -100, right: 160, bottom: 20 },
				{ left: 60, top: 90, right: 160, bottom: 200 },
				{ left: 300, top: 0, right: 340, bottom: 40 },
			];
			const ordered = isReversed ? [...walls].reverse() : walls;
			return [
				route(
					[
						[0, 0],
						[0, 50],
						[200, 50],
						[200, 100],
					],
					ordered,
				),
				route(
					[
						[20, 0],
						[20, 50],
						[220, 50],
						[220, 100],
					],
					ordered,
				),
				route(
					[
						[40, 0],
						[40, 55],
						[240, 55],
						[240, 100],
					],
					ordered,
				),
			];
		};
		const forward = build(false);
		const again = build(false);
		const reversed = build(true);

		nudgeRoutes(forward, []);
		nudgeRoutes(again, []);
		nudgeRoutes(reversed, []);

		expect(again.map(({ path }) => path)).toEqual(
			forward.map(({ path }) => path),
		);
		expect(reversed.map(({ path }) => path)).toEqual(
			forward.map(({ path }) => path),
		);
		expect(forward.map(({ path }) => path[1].y)).not.toEqual([50, 50, 55]);
	});

	describe("ends sliding along their box sides", () => {
		// A box below y 0, its top side open to x 20..80 for ends to slide over.
		const box = { left: 0, top: 0, right: 100, bottom: 40 };
		const onTop = (): Partial<RouteEnd> => ({
			sideKey: "box:top",
			slide: { min: 20, max: 80 },
			ownWallIndices: [0],
		});
		/** A route leaving the box's top at `x`, turning toward `turnX` 30px up. */
		const leaving = (
			x: number,
			turnX: number,
			ends: Partial<RouteEnd> = onTop(),
		): RouteToNudge =>
			route(
				[
					[x, 0],
					[x, -30],
					[turnX, -30],
					[turnX, -200],
				],
				[box],
				{ source: ends },
			);

		it("fans two ends at one spot EDGE_END_SPACING apart, each on the side its route turns to", () => {
			const toRight = leaving(50, 300);
			const toLeft = leaving(50, -200);

			nudgeRoutes([toRight, toLeft], []);

			expect(toPairs(toLeft.path).slice(0, 2)).toEqual([
				[40, 0],
				[40, -30],
			]);
			expect(toPairs(toRight.path).slice(0, 2)).toEqual([
				[60, 0],
				[60, -30],
			]);
			expect(countCrossings([toRight, toLeft])).toBe(0);
		});

		it("fans two ends standing 16 to 19px apart too", () => {
			const toLeft = leaving(42, -200);
			const toRight = leaving(60, 300);

			nudgeRoutes([toLeft, toRight], []);

			expect([toLeft.path[0].x, toRight.path[0].x]).toEqual([41, 61]);
		});

		it("squeezes the ends of a side too short for EDGE_END_SPACING alone, the lanes of their group keeping the lane spacing", () => {
			// Three routes leave the box's top at x 50, where 40..60 shares 20px as two
			// gaps of 10, run up x -100 together and enter a box above at x -150, whose
			// bottom side has room for EDGE_END_SPACING. Boxes inside the routes' steps
			// keep them from being straightened.
			const routes = [0, 1, 2].map(() =>
				route(
					[
						[50, 0],
						[50, -30],
						[-100, -30],
						[-100, -200],
						[-150, -200],
						[-150, -230],
					],
					[
						box,
						{ left: -60, top: -150, right: 0, bottom: -80 },
						{ left: -150, top: -150, right: -130, bottom: -110 },
					],
					{
						source: { ...onTop(), slide: { min: 40, max: 60 } },
						target: {
							sideKey: "above:bottom",
							slide: { min: -190, max: -110 },
						},
					},
				),
			);

			nudgeRoutes(routes, []);

			const sortedAt = (pointIndex: number): number[] =>
				routes.map(({ path }) => path[pointIndex].x).sort((a, b) => a - b);
			expect(sortedAt(0)).toEqual([40, 50, 60]);
			const lanes = sortedAt(2);
			expect([lanes[1] - lanes[0], lanes[2] - lanes[1]]).toEqual([16, 16]);
			const targets = sortedAt(5);
			expect([targets[1] - targets[0], targets[2] - targets[1]]).toEqual([
				20, 20,
			]);
		});

		it("squeezes ends a wall confines, the lanes of their group keeping the lane spacing", () => {
			// Walls either side of the spot leave the ends 48..52 of their slides.
			const walls = [
				box,
				{ left: 36, top: -20, right: 40, bottom: -10 },
				{ left: 60, top: -20, right: 64, bottom: -10 },
			];
			const routes = [-200, 300].map((turnX) =>
				route(
					[
						[50, 0],
						[50, -30],
						[turnX, -30],
						[turnX, -200],
						[turnX + 50, -200],
					],
					walls,
					{ source: onTop() },
				),
			);
			routes.push(
				route(
					[
						[-150, -300],
						[-150, -250],
						[-200, -250],
						[-200, -100],
						[-250, -100],
					],
					walls,
				),
			);

			nudgeRoutes(routes, []);

			const [toLeft, toRight, alongside] = routes;
			expect([toLeft.path[0].x, toRight.path[0].x]).toEqual([48, 52]);
			// The run alongside the left route's keeps the full spacing off it.
			expect(Math.abs(toLeft.path[2].x - alongside.path[2].x)).toBe(16);
		});

		it("spreads two straight routes between the same two sides", () => {
			// Boxes left of x 100 and right of x 300, their facing sides open to y 8..32.
			const walls = [
				{ left: 40, top: 0, right: 100, bottom: 40 },
				{ left: 300, top: 0, right: 360, bottom: 40 },
			];
			const straight = (): RouteToNudge =>
				route(
					[
						[100, 20],
						[300, 20],
					],
					walls,
					{
						source: {
							sideKey: "left:right",
							slide: { min: 8, max: 32 },
							ownWallIndices: [0],
						},
						target: {
							sideKey: "right:left",
							slide: { min: 8, max: 32 },
							ownWallIndices: [1],
						},
					},
				);
			const routes = [straight(), straight()];

			nudgeRoutes(routes, []);

			expect(routes.map(({ path }) => toPairs(path))).toEqual([
				[
					[100, 10],
					[300, 10],
				],
				[
					[100, 30],
					[300, 30],
				],
			]);
		});

		describe("a Z route whose two stubs both move", () => {
			// The Z leaves a box below at x 0 and enters one above at x 10; a route beside
			// each stub turns away from it, pushing it: the lower one always right. A wall
			// beside each stub, the lower one's right and the upper one's left, keeps
			// either from moving onto the other's line.
			const zWalls = [
				{ left: 20, top: -40, right: 40, bottom: -10 },
				{ left: -24, top: -90, right: -4, bottom: -60 },
			];
			const build = (
				upperTurnX: number,
				isReversed: boolean,
			): RouteToNudge[] => {
				const below: Partial<RouteEnd> = {
					sideKey: "below:top",
					slide: { min: -40, max: 40 },
				};
				const above: Partial<RouteEnd> = {
					sideKey: "above:bottom",
					slide: { min: -30, max: 50 },
				};
				const zPoints: [number, number][] = [
					[0, 0],
					[0, -50],
					[10, -50],
					[10, -100],
				];
				const zigzag = routeOneWay(isReversed, zPoints, zWalls, {
					source: below,
					target: above,
				});
				return [
					zigzag,
					route(
						[
							[0, 0],
							[0, -30],
							[-200, -30],
						],
						[],
						{ source: below },
					),
					route(
						[
							[10, -100],
							[10, -70],
							[upperTurnX, -70],
						],
						[],
						{ source: above },
					),
				];
			};
			it("keeps the stubs pushed toward each other LEAST_JOG apart, whichever end comes first", () => {
				const [zigzag] = nudgeBothWays((isReversed) => build(200, isReversed));

				expect(toPairs(zigzag.path)).toEqual([
					[5, 0],
					[5, -50],
					[6, -50],
					[6, -100],
				]);
			});

			it("lets the stubs pushed one way pass where the other stood, whichever end comes first", () => {
				const [zigzag] = nudgeBothWays((isReversed) => build(-200, isReversed));

				expect(toPairs(zigzag.path)).toEqual([
					[10, 0],
					[10, -50],
					[20, -50],
					[20, -100],
				]);
			});
		});

		it("keeps a stub from sliding across its segment two on that cannot move", () => {
			// The route's run up x 54.5 lies between two walls 1px apart; the stub is
			// pushed right by an end beside it turning left. A wall right of the stub
			// keeps it from moving onto the run's line.
			const walls = [
				box,
				{ left: 40, top: -190, right: 54, bottom: -40 },
				{ left: 55, top: -190, right: 70, bottom: -40 },
				{ left: 64, top: -25, right: 80, bottom: -5 },
			];
			const jogging = route(
				[
					[50, 0],
					[50, -30],
					[54.5, -30],
					[54.5, -200],
					[300, -200],
				],
				walls,
				{ source: onTop() },
			);
			const toLeft = leaving(50, -200);

			nudgeRoutes([jogging, toLeft], []);

			expect(jogging.path[0].x).toBe(53);
			expect(jogging.path[1].x).toBeLessThan(jogging.path[2].x);
			expect(toLeft.path[0].x).toBe(33);
		});
	});

	describe("straightening jogs", () => {
		/** An end on a box's right side, free to slide over y `min`..`max`. */
		const sliding = (min: number, max: number): Partial<RouteEnd> => ({
			sideKey: "box:right",
			slide: { min, max },
		});
		/** A Z leaving the box's right side at y 20, entering one at y 23 that stays. */
		const zPoints: [number, number][] = [
			[0, 20],
			[100, 20],
			[100, 23],
			[200, 23],
		];
		const jogged = (
			isReversed: boolean,
			slide: Partial<RouteEnd>,
			walls: readonly BoundingBox[] = [],
		): RouteToNudge =>
			routeOneWay(isReversed, zPoints, walls, { source: slide });

		it("slides a stub onto the next segment's line, the route losing its jog", () => {
			const [straightened] = nudgeBothWays((isReversed) => [
				jogged(isReversed, sliding(10, 30)),
			]);

			expect(toPairs(straightened.path)).toEqual([
				[0, 23],
				[200, 23],
			]);
		});

		it("moves the shorter of the two segments either side of a jog", () => {
			const [straightened] = nudgeBothWays((isReversed) => [
				routeOneWay(isReversed, [
					[-50, 100],
					[-50, 20],
					[100, 20],
					[100, 23],
					[150, 23],
					[150, 100],
				]),
			]);

			expect(toPairs(straightened.path)).toEqual([
				[-50, 100],
				[-50, 20],
				[150, 20],
				[150, 100],
			]);
		});

		it("moves the one with the lower coordinate of two as long", () => {
			const [straightened] = nudgeBothWays((isReversed) => [
				routeOneWay(isReversed, [
					[-50, 100],
					[-50, 20],
					[100, 20],
					[100, 23],
					[250, 23],
					[250, 100],
				]),
			]);

			expect(toPairs(straightened.path)).toEqual([
				[-50, 100],
				[-50, 23],
				[250, 23],
				[250, 100],
			]);
		});

		it("straightens a jog longer than the lane spacing", () => {
			// The run along y 60, the shorter, moves 40px up onto y 20.
			const [straightened] = nudgeBothWays((isReversed) => [
				routeOneWay(isReversed, [
					[-50, 100],
					[-50, 20],
					[100, 20],
					[100, 60],
					[150, 60],
					[150, 100],
				]),
			]);

			expect(toPairs(straightened.path)).toEqual([
				[-50, 100],
				[-50, 20],
				[150, 20],
				[150, 100],
			]);
		});

		describe("moving a run inside a frame toward its side", () => {
			// The run along y 0 lies inside a frame whose bottom side lies below the run
			// along y 30 it would move onto. A box between them over the run along y 30
			// keeps that one from moving up instead.
			const points: [number, number][] = [
				[250, 100],
				[250, 0],
				[100, 0],
				[100, 30],
				[-100, 30],
				[-100, -100],
			];
			const nudgeInFrame = (frameBottom: number): RouteToNudge =>
				nudgeBothWays(
					(isReversed) => [
						routeOneWay(isReversed, points, [
							{ left: -80, top: 8, right: 60, bottom: 20 },
						]),
					],
					[{ left: 0, top: -200, right: 300, bottom: frameBottom }],
				)[0];

			it("straightens the jog when the new line keeps the lane spacing off the side", () => {
				expect(toPairs(nudgeInFrame(46).path)).toEqual([
					[250, 100],
					[250, 30],
					[-100, 30],
					[-100, -100],
				]);
			});

			it("leaves the jog when the new line would come nearer the side than the lane spacing", () => {
				// The run stands 40px off the side; y 30 lies 10px off it.
				expect(toPairs(nudgeInFrame(40).path)).toEqual(points);
			});
		});

		it("moves the other segment when the one tried first may not move", () => {
			// The stub at y 20, tried first for its lower line, stays; the other slides.
			const [straightened] = nudgeBothWays((isReversed) => [
				routeOneWay(isReversed, zPoints, [], {
					target: { sideKey: "other:left", slide: { min: 10, max: 30 } },
				}),
			]);

			expect(toPairs(straightened.path)).toEqual([
				[0, 20],
				[200, 20],
			]);
		});

		it("closes the far neighbour between two runs going the same way, merging all three", () => {
			// Moving the run down x 5 onto x 0 closes both 5px jogs at once.
			const [straightened] = nudgeBothWays((isReversed) => [
				routeOneWay(isReversed, [
					[0, 0],
					[0, 50],
					[5, 50],
					[5, 100],
					[0, 100],
					[0, 200],
				]),
			]);

			expect(toPairs(straightened.path)).toEqual([
				[0, 0],
				[0, 200],
			]);
		});

		it("takes the shorter jog first", () => {
			// Each route's first stub would move onto its last one's line, the 41px jog's
			// up onto y 18 and the 3px jog's down onto y 3; whichever moves first keeps
			// the other off, the two lines standing 15px apart, short of the lane
			// spacing. The 41px jog's route comes first in the input.
			const [longer, shorter] = nudgeBothWays((isReversed) => [
				routeOneWay(
					isReversed,
					[
						[90, 59],
						[-50, 59],
						[-50, 18],
						[-200, 18],
					],
					[],
					{ source: { sideKey: "other:left", slide: { min: 0, max: 60 } } },
				),
				route(
					[
						[0, 0],
						[100, 0],
						[100, 3],
						[200, 3],
					],
					[],
					{ source: sliding(-10, 10) },
				),
			]);

			expect(toPairs(shorter.path)).toEqual([
				[0, 3],
				[200, 3],
			]);
			expect(toPairs(longer.path)).toEqual([
				[90, 59],
				[-50, 59],
				[-50, 18],
				[-200, 18],
			]);
		});

		it("walks the jogs again until a walk removes none", () => {
			// Taking the jog along y 50 moves the run down x 3 onto x 0, which leaves the
			// jog along y 100 6px long; only the next walk takes that one, sliding the
			// last stub onto x 0.
			const [straightened] = nudgeBothWays((isReversed) => [
				routeOneWay(
					isReversed,
					[
						[0, 0],
						[0, 50],
						[3, 50],
						[3, 100],
						[6, 100],
						[6, 200],
					],
					[],
					{ target: { sideKey: "other:top", slide: { min: -10, max: 10 } } },
				),
			]);

			expect(toPairs(straightened.path)).toEqual([
				[0, 0],
				[0, 200],
			]);
		});

		it("lets a segment come nearer one it already runs nearer than the lane spacing, no nearer than it stands", () => {
			// The run up x 10 stands 10px off the U's other arm, and moves 3px away.
			const [straightened] = nudgeBothWays((isReversed) => [
				routeOneWay(isReversed, [
					[0, 60],
					[0, 100],
					[10, 100],
					[10, 50],
					[13, 50],
					[13, 0],
				]),
			]);

			expect(toPairs(straightened.path)).toEqual([
				[0, 60],
				[0, 100],
				[13, 100],
				[13, 0],
			]);
		});

		describe("leaves a jog", () => {
			it("whose stub's slide stops short of the other segment's line", () => {
				const [kept] = nudgeBothWays((isReversed) => [
					jogged(isReversed, sliding(10, 22)),
				]);

				expect(toPairs(kept.path)).toEqual(zPoints);
			});

			it("whose segment would come within the lane spacing of a box, nearer than it runs", () => {
				// 14px above the box; WALL_CLEARANCE alone would let it come down 3px.
				const [kept] = nudgeBothWays((isReversed) => [
					jogged(isReversed, sliding(10, 30), [
						{ left: 20, top: 34, right: 80, bottom: 60 },
					]),
				]);

				expect(toPairs(kept.path)).toEqual(zPoints);
			});

			it("whose segment moving would turn its other neighbour round", () => {
				// Moving the run down x 5 onto x -3 would turn the run along y 50 back
				// past x 0. Moving it onto x 0 instead, for the jog along y 50, would
				// cross the route along y 75.
				const points: [number, number][] = [
					[0, 0],
					[0, 50],
					[5, 50],
					[5, 100],
					[-3, 100],
					[-3, 200],
				];
				const [kept] = nudgeBothWays((isReversed) => [
					routeOneWay(isReversed, points),
					route([
						[-1, 75],
						[2, 75],
					]),
				]);

				expect(toPairs(kept.path)).toEqual(points);
			});

			it("whose segment moving would close its other neighbour at the foot of a U", () => {
				const points: [number, number][] = [
					[0, 60],
					[0, 100],
					[10, 100],
					[10, 50],
					[0, 50],
					[0, 0],
				];
				const [kept] = nudgeBothWays((isReversed) => [
					routeOneWay(isReversed, points),
				]);

				expect(toPairs(kept.path)).toEqual(points);
			});

			it("whose segment would come nearer another route's than the lane spacing", () => {
				const [kept] = nudgeBothWays((isReversed) => [
					jogged(isReversed, sliding(10, 30)),
					route([
						[10, 36],
						[90, 36],
					]),
				]);

				expect(toPairs(kept.path)).toEqual(zPoints);
			});

			it("whose segment's other neighbour would stretch alongside another route's", () => {
				// Moving the run down x 40 onto x 43 stretches the run along y 50 under the
				// route along y 40, 10px off. A box left of the run keeps it from moving
				// onto x 0 instead.
				const points: [number, number][] = [
					[0, 0],
					[0, 50],
					[40, 50],
					[40, 100],
					[43, 100],
					[43, 200],
				];
				const [kept] = nudgeBothWays((isReversed) => [
					routeOneWay(isReversed, points, [
						{ left: 10, top: 70, right: 30, bottom: 90 },
					]),
					route([
						[41, 40],
						[90, 40],
					]),
				]);

				expect(toPairs(kept.path)).toEqual(points);
			});

			it("whose segment would bring the two arms of a U nearer than the lane spacing", () => {
				const points: [number, number][] = [
					[0, 60],
					[0, 100],
					[20, 100],
					[20, 50],
					[10, 50],
					[10, 0],
				];
				const [kept] = nudgeBothWays((isReversed) => [
					routeOneWay(isReversed, points),
				]);

				expect(toPairs(kept.path)).toEqual(points);
			});

			it("whose stub would come nearer another end of its side than their end gap", () => {
				// The top side's ends stand 18px apart, its end gap; moving the stub at
				// x 18 onto x 16 would bring it 2px nearer, though still the lane spacing
				// off.
				const points: [number, number][] = [
					[18, 0],
					[18, -50],
					[16, -50],
					[16, -100],
				];
				const [kept] = nudgeBothWays((isReversed) => [
					routeOneWay(isReversed, points, [], {
						source: { sideKey: "box:top", slide: { min: 15, max: 18 } },
					}),
					route(
						[
							[0, 0],
							[0, -80],
							[-100, -80],
						],
						[],
						{ source: { sideKey: "box:top", slide: { min: 0, max: 0 } } },
					),
				]);

				expect(toPairs(kept.path)).toEqual(points);
			});

			it("whose segment would pass to the other side of one it runs alongside", () => {
				// The stub at x 50, kept 2px off the route down x 52 by the spreading,
				// would land 2.5px past it on the run up x 54.5, which walls 1px apart pin.
				const walls = [
					{ left: 0, top: 0, right: 100, bottom: 40 },
					{ left: 40, top: -190, right: 54, bottom: -40 },
					{ left: 55, top: -190, right: 70, bottom: -40 },
				];
				const points: [number, number][] = [
					[50, 0],
					[50, -30],
					[54.5, -30],
					[54.5, -200],
					[300, -200],
				];
				const [kept] = nudgeBothWays((isReversed) => [
					routeOneWay(isReversed, points, walls, {
						source: {
							sideKey: "box:top",
							slide: { min: 50, max: 56 },
							ownWallIndices: [0],
						},
					}),
					route([
						[52, -5],
						[52, -25],
					]),
				]);

				expect(toPairs(kept.path)).toEqual(points);
			});

			it("whose segment moving would cross another route", () => {
				const [kept] = nudgeBothWays((isReversed) => [
					jogged(isReversed, sliding(10, 30)),
					route([
						[50, 22],
						[50, 80],
					]),
				]);

				expect(toPairs(kept.path)).toEqual(zPoints);
			});
		});
	});
});
