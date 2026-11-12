import type { BoundingBox, Point, Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { calcAnchorPoint } from "../../shared/calcAnchorPoint";
import { GAP_LANE_SPACING } from "../../shared/edgeSpacing";
import type { LayoutEdgeAnchor, LayoutSide } from "../../shared/types";
import { EDGE_ROUTE_MARGIN } from "../edgeRoutingCosts";
import { listContendedSideKeys, listEndCandidates } from "../endCandidates";
import { routeEdgesAroundNodes } from "../routeEdgesAroundNodes";
import type { RoutableNode, RoutedEdge } from "../types";

const box = (
	id: string,
	x: number,
	y: number,
	width = 60,
	height = 40,
): RoutableNode => ({ id, bounds: { x, y, width, height } });

/** A frame such as a container shape: see RoutableNode.isHollow. */
const hollowBox = (
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
): RoutableNode => ({ ...box(id, x, y, width, height), isHollow: true });

const edge = (id: string, sourceId: string, targetId: string) => ({
	id,
	sourceId,
	targetId,
});

/** The whole route: the source end, the corners, the target end. */
const pathOf = (
	routed: RoutedEdge,
	nodes: readonly RoutableNode[],
	sourceId: string,
	targetId: string,
): Point[] => {
	const boundsOf = (id: string): Rect =>
		(nodes.find((node) => node.id === id) as RoutableNode).bounds;
	return [
		calcAnchorPoint(boundsOf(sourceId), routed.source),
		...routed.points,
		calcAnchorPoint(boundsOf(targetId), routed.target),
	];
};

/** Whether some segment of the path runs through the rect's inside (its edges are outside). */
const entersRect = (path: readonly Point[], rect: Rect): boolean =>
	path.slice(1).some((point, index) => {
		const previous = path[index];
		const left = Math.min(previous.x, point.x);
		const right = Math.max(previous.x, point.x);
		const top = Math.min(previous.y, point.y);
		const bottom = Math.max(previous.y, point.y);
		return (
			left < rect.x + rect.width &&
			right > rect.x &&
			top < rect.y + rect.height &&
			bottom > rect.y
		);
	});

const isRightAngled = (path: readonly Point[]): boolean =>
	path
		.slice(1)
		.every(
			(point, index) => point.x === path[index].x || point.y === path[index].y,
		);

/** The path's segments, each from its start point to its end point. */
const segmentsOf = (path: readonly Point[]): (readonly [Point, Point])[] =>
	path.slice(1).map((point, index) => [path[index], point] as const);

/** How long the stretch is that two parallel segments share; 0 or less when none. */
const calcSharedStretch = (
	[a, b]: readonly [Point, Point],
	[c, d]: readonly [Point, Point],
	isHorizontal: boolean,
): number => {
	const along = (point: Point): number => (isHorizontal ? point.x : point.y);
	return (
		Math.min(Math.max(along(a), along(b)), Math.max(along(c), along(d))) -
		Math.max(Math.min(along(a), along(b)), Math.min(along(c), along(d)))
	);
};

/** Whether a segment of one path crosses one of the other at right angles, inside both. */
const doPathsCross = (
	path: readonly Point[],
	other: readonly Point[],
): boolean =>
	segmentsOf(path).some((segment) =>
		segmentsOf(other).some((otherSegment) => {
			const [horizontal, vertical] =
				segment[0].y === segment[1].y
					? [segment, otherSegment]
					: [otherSegment, segment];
			const { x } = vertical[0];
			const { y } = horizontal[0];
			return (
				vertical[1].x === x &&
				horizontal[1].y === y &&
				x > Math.min(horizontal[0].x, horizontal[1].x) &&
				x < Math.max(horizontal[0].x, horizontal[1].x) &&
				y > Math.min(vertical[0].y, vertical[1].y) &&
				y < Math.max(vertical[0].y, vertical[1].y)
			);
		}),
	);

describe("routeEdgesAroundNodes", () => {
	it("runs straight between two boxes facing each other", () => {
		const result = routeEdgesAroundNodes(
			[box("a", 0, 0), box("b", 300, 0)],
			[edge("e", "a", "b")],
		);

		expect(result).toEqual({
			edges: [
				{
					id: "e",
					source: { side: "right", t: 0.5 },
					target: { side: "left", t: 0.5 },
					points: [],
				},
			],
			unroutedEdgeIds: [],
		});
	});

	it("puts an end in line with the other box's centre when that lets it run straight", () => {
		const result = routeEdgesAroundNodes(
			[box("a", 0, 0), box("b", 300, 10)],
			[edge("e", "a", "b")],
		);

		// One end sits at its side's centre and the other in line with it.
		const routed = result.edges[0];
		expect(routed).toMatchObject({
			source: { side: "right" },
			target: { side: "left" },
			points: [],
		});
		expect([
			{ source: 0.75, target: 0.5 },
			{ source: 0.5, target: 0.25 },
		]).toContainEqual({ source: routed.source.t, target: routed.target.t });
	});

	it("ends on the sides facing a box below", () => {
		const result = routeEdgesAroundNodes(
			[box("a", 0, 0), box("b", 0, 300)],
			[edge("e", "a", "b")],
		);

		expect(result.edges[0]).toMatchObject({
			source: { side: "bottom", t: 0.5 },
			target: { side: "top", t: 0.5 },
			points: [],
		});
	});

	it("goes around a box standing between the ends, at right angles", () => {
		const nodes = [
			box("a", 0, 0),
			box("b", 300, 0),
			box("c", 150, -20, 60, 80),
		];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")]);

		const path = pathOf(result.edges[0], nodes, "a", "b");
		expect(result.edges[0].points.length).toBeGreaterThan(0);
		expect(isRightAngled(path)).toBe(true);
		expect(entersRect(path, nodes[2].bounds)).toBe(false);
	});

	it("goes around another box's caption", () => {
		const caption = { x: 150, y: 10, width: 80, height: 20 };
		const nodes = [
			box("a", 0, 0),
			box("b", 400, 0),
			{ ...box("c", 160, -80), labelBounds: caption },
		];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")]);

		const path = pathOf(result.edges[0], nodes, "a", "b");
		expect(entersRect(path, caption)).toBe(false);
		expect(result.edges[0].points.length).toBeGreaterThan(0);
	});

	it("goes around an obstacle given in the options, such as a title band", () => {
		const band = { x: 100, y: -100, width: 120, height: 300 };
		const nodes = [box("a", 0, 0), box("b", 300, 0)];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
			obstacles: [band],
		});

		expect(entersRect(pathOf(result.edges[0], nodes, "a", "b"), band)).toBe(
			false,
		);
	});

	it("runs through a box covering an end, such as a background", () => {
		const nodes = [
			box("background", -100, -100, 600, 300),
			box("a", 0, 0),
			box("b", 300, 0),
		];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
			obstacles: [{ x: -50, y: -50, width: 500, height: 200 }],
		});

		expect(result.edges[0]).toMatchObject({
			source: { side: "right" },
			target: { side: "left" },
			points: [],
		});
	});

	it("leaves a bottom side straight down through its own caption", () => {
		const nodes = [
			{
				...box("a", 0, 0),
				labelBounds: { x: -10, y: 44, width: 80, height: 20 },
			},
			box("b", 0, 300),
		];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")]);

		expect(result.edges[0]).toMatchObject({
			source: { side: "bottom", t: 0.5 },
			target: { side: "top", t: 0.5 },
			points: [],
		});
	});

	it("runs a bottom stub the margin past the caption, not past the box", () => {
		const caption = { x: -10, y: 44, width: 80, height: 20 };
		const nodes = [
			{ ...box("a", 0, 0), labelBounds: caption },
			box("b", 300, 300),
		];
		// Walls flush against the other three sides leave no room for a stub there.
		const walls = [
			{ x: -40, y: -40, width: 140, height: 40 },
			{ x: -40, y: -40, width: 40, height: 80 },
			{ x: 60, y: -40, width: 40, height: 80 },
			// Two margins below the caption, so the stub's tip is where the route must turn.
			{ x: -40, y: 124, width: 140, height: 40 },
		];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
			obstacles: walls,
		});

		const routed = result.edges[0];
		expect(routed.source.side).toBe("bottom");
		expect(routed.points[0]).toEqual({
			x: 30,
			y: caption.y + caption.height + EDGE_ROUTE_MARGIN,
		});
	});

	it("prefers another side to a bottom one through its own caption when they cost the same otherwise", () => {
		const withCaption = [
			{
				...box("a", 0, 0),
				labelBounds: { x: 10, y: 44, width: 40, height: 20 },
			},
			box("b", 400, 400),
		];
		const withoutCaption = [box("a", 0, 0), box("b", 400, 400)];

		const captioned = routeEdgesAroundNodes(withCaption, [edge("e", "a", "b")]);
		const plain = routeEdgesAroundNodes(withoutCaption, [edge("e", "a", "b")]);

		expect(plain.edges[0].source.side).toBe("bottom");
		expect(captioned.edges[0].source.side).not.toBe("bottom");
	});

	it("keeps no route through its own caption beyond the bottom stub", () => {
		const caption = { x: -40, y: 44, width: 140, height: 20 };
		const nodes = [
			{ ...box("a", 0, 0), labelBounds: caption },
			box("b", 0, -300),
		];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")]);

		const routed = result.edges[0];
		const path = pathOf(routed, nodes, "a", "b");
		const pastStub = routed.source.side === "bottom" ? path.slice(1) : path;
		expect(entersRect(pastStub, caption)).toBe(false);
	});

	it("halves a stub facing a box nearer than two margins, so the two meet halfway", () => {
		const result = routeEdgesAroundNodes(
			[box("a", 0, 0), box("b", 100, 0)],
			[edge("e", "a", "b")],
		);

		expect(result.edges[0]).toMatchObject({
			source: { side: "right", t: 0.5 },
			target: { side: "left", t: 0.5 },
			points: [],
		});
	});

	it("keeps the margin from a box it passes where a short jog allows", () => {
		const passed = box("c", 100, 30, 200, 40);
		const nodes = [box("a", 0, 0), box("b", 400, 0), passed];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")]);

		const band = {
			x: passed.bounds.x - EDGE_ROUTE_MARGIN,
			y: passed.bounds.y - EDGE_ROUTE_MARGIN,
			width: passed.bounds.width + EDGE_ROUTE_MARGIN * 2,
			height: passed.bounds.height + EDGE_ROUTE_MARGIN * 2,
		};
		expect(entersRect(pathOf(result.edges[0], nodes, "a", "b"), band)).toBe(
			false,
		);
	});

	it("takes a dearer side rather than cross a route drawn before it", () => {
		// Two right-angled ways from a to b bend once each: the upper crosses t → u,
		// the lower leaves a's bottom through its caption.
		const nodes = [
			{
				...box("a", 0, 0),
				labelBounds: { x: 10, y: 44, width: 40, height: 20 },
			},
			box("b", 400, 200),
			box("t", 200, -100),
			box("u", 200, 100),
		];

		const result = routeEdgesAroundNodes(nodes, [
			edge("drawn", "t", "u"),
			edge("e", "a", "b"),
		]);

		expect(result.edges[1].source.side).toBe("bottom");
	});

	it("takes a dearer side rather than cross a border twice", () => {
		const nodes = [
			{
				...box("a", 0, 0),
				labelBounds: { x: 10, y: 44, width: 40, height: 20 },
			},
			box("b", 400, 200),
		];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
			borders: [{ x: 150, y: -50, width: 100, height: 140 }],
		});

		expect(result.edges[0].source.side).toBe("bottom");
	});

	it("passes through a gap narrower than two margins rather than around", () => {
		const leftWall = { x: -400, y: 180, width: 500, height: 40 };
		const rightWall = { x: 130, y: 180, width: 400, height: 40 };
		const nodes = [box("a", 0, 0), box("b", 0, 400)];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
			obstacles: [leftWall, rightWall],
		});

		const path = pathOf(result.edges[0], nodes, "a", "b");
		expect(entersRect(path, leftWall)).toBe(false);
		expect(entersRect(path, rightWall)).toBe(false);
		const crossing = path
			.slice(1)
			.find(
				(point, index) =>
					point.x === path[index].x &&
					Math.min(point.y, path[index].y) <= 180 &&
					Math.max(point.y, path[index].y) >= 220,
			);
		expect(crossing?.x).toBeGreaterThanOrEqual(100);
		expect(crossing?.x).toBeLessThanOrEqual(130);
	});

	it("takes the middle of a gap narrower than two margins, where the bands weigh least", () => {
		const nodes = [box("a", 0, 0), box("b", 0, 400)];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
			obstacles: [
				{ x: -400, y: 180, width: 500, height: 40 },
				{ x: 140, y: 180, width: 400, height: 40 },
			],
		});

		// The gap runs from x 100 to 140; the bands meet at 110 and 130.
		const path = pathOf(result.edges[0], nodes, "a", "b");
		const crossing = path
			.slice(1)
			.find(
				(point, index) =>
					point.x === path[index].x &&
					Math.min(point.y, path[index].y) <= 180 &&
					Math.max(point.y, path[index].y) >= 220,
			);
		expect(crossing?.x).toBe(120);
	});

	it("runs neither through the seam of two boxes that touch nor along a box's edge", () => {
		const leftWall = { x: -400, y: 180, width: 500, height: 40 };
		const rightWall = { x: 100, y: 180, width: 400, height: 40 };
		const nodes = [box("a", 0, 0), box("b", 0, 400)];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
			obstacles: [leftWall, rightWall],
		});

		const path = pathOf(result.edges[0], nodes, "a", "b");
		const alongAnEdge = path.slice(1).some((point, index) => {
			const previous = path[index];
			const top = Math.min(point.y, previous.y);
			const bottom = Math.max(point.y, previous.y);
			return (
				point.x === previous.x &&
				[leftWall.x, rightWall.x, rightWall.x + rightWall.width].includes(
					point.x,
				) &&
				top < 220 &&
				bottom > 180
			);
		});
		expect(result.unroutedEdgeIds).toEqual([]);
		expect(alongAnEdge).toBe(false);
	});

	it("runs through no seam between two boxes stacked one on the other", () => {
		const upper = { x: 150, y: 100, width: 100, height: 100 };
		const lower = { x: 150, y: 200, width: 100, height: 100 };
		const nodes = [box("a", 0, 180), box("b", 400, 180)];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
			obstacles: [upper, lower],
		});

		const path = pathOf(result.edges[0], nodes, "a", "b");
		const alongTheSeam = path.slice(1).some((point, index) => {
			const previous = path[index];
			return (
				point.y === 200 &&
				previous.y === 200 &&
				Math.min(point.x, previous.x) < 250 &&
				Math.max(point.x, previous.x) > 150
			);
		});
		expect(result.unroutedEdgeIds).toEqual([]);
		expect(alongTheSeam).toBe(false);
	});

	it("keeps off a border's side rather than run alongside it", () => {
		const nodes = [box("a", 0, 0), box("b", 400, 0)];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
			borders: [{ x: 100, y: 30, width: 200, height: 200 }],
		});

		// Straight, it would run 10px above the border's top side for 200px.
		expect(result.edges[0].points).not.toEqual([]);
	});

	it("keeps a later route off an earlier one where another way is cheap", () => {
		const nodes = [box("a", 0, 0, 60, 120), box("b", 300, 0, 60, 120)];

		const result = routeEdgesAroundNodes(nodes, [
			edge("first", "a", "b"),
			edge("second", "a", "b"),
		]);

		const [first, second] = result.edges;
		expect(first).toMatchObject({ points: [] });
		expect(second).not.toEqual({ ...first, id: "second" });
	});

	it("gives the same routes whatever order the nodes come in", () => {
		const nodes = [
			box("a", 0, 0),
			box("b", 300, 200),
			box("c", 150, 60, 60, 80),
			box("d", 0, 300),
		];
		const edges = [
			edge("e1", "a", "b"),
			edge("e2", "d", "b"),
			edge("e3", "a", "d"),
		];

		const forward = routeEdgesAroundNodes(nodes, edges);
		const again = routeEdgesAroundNodes(nodes, edges);
		const reversed = routeEdgesAroundNodes([...nodes].reverse(), edges);

		expect(again).toEqual(forward);
		expect(reversed).toEqual(forward);
	});

	it("finds a route that has to go far out of its way", () => {
		// The only way round the wall lies past its right end, 470px off the ends.
		const wall = { x: -2000, y: 180, width: 2500, height: 40 };
		const nodes = [box("a", 0, 0), box("b", 0, 400)];

		const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
			obstacles: [wall],
		});

		expect(result.unroutedEdgeIds).toEqual([]);
		expect(entersRect(pathOf(result.edges[0], nodes, "a", "b"), wall)).toBe(
			false,
		);
	});

	it("reports an edge walled in as unrouted, and routes the others", () => {
		const walls = [
			{ x: 200, y: -100, width: 300, height: 40 },
			{ x: 200, y: 100, width: 300, height: 40 },
			{ x: 200, y: -100, width: 40, height: 240 },
			{ x: 460, y: -100, width: 40, height: 240 },
		];
		const result = routeEdgesAroundNodes(
			[box("a", 0, 0), box("b", 320, 0), box("c", 0, 300)],
			[edge("walled", "a", "b"), edge("open", "a", "c")],
			{ obstacles: walls },
		);

		expect(result.unroutedEdgeIds).toEqual(["walled"]);
		expect(result.edges.map(({ id }) => id)).toEqual(["open"]);
	});

	it("reports a self loop as unrouted", () => {
		const result = routeEdgesAroundNodes(
			[box("a", 0, 0)],
			[edge("loop", "a", "a")],
		);

		expect(result).toEqual({ edges: [], unroutedEdgeIds: ["loop"] });
	});

	it("refuses an edge naming a node not given, and a node given twice", () => {
		expect(() =>
			routeEdgesAroundNodes([box("a", 0, 0)], [edge("e", "a", "missing")]),
		).toThrow("edge e names node missing, which is not given");
		expect(() =>
			routeEdgesAroundNodes([box("a", 0, 0), box("a", 100, 0)], []),
		).toThrow("node a is given twice");
	});

	describe("routing each edge again against the others", () => {
		// m stands between a and b, u straight above it: "around" goes round m above or
		// below, and "down" runs straight from u into m.
		const nodes = [
			box("a", 0, 0),
			box("b", 300, 0),
			box("u", 150, -120),
			box("m", 150, 0),
		];

		it("takes a route away from where a later edge has to cross it", () => {
			const result = routeEdgesAroundNodes(nodes, [
				edge("around", "a", "b"),
				edge("down", "u", "m"),
			]);

			// Routed once each in the order given, "around" would go over m and "down"
			// cross it.
			const [around, down] = result.edges;
			expect(around.source.side).toBe("bottom");
			expect(
				doPathsCross(
					pathOf(around, nodes, "a", "b"),
					pathOf(down, nodes, "u", "m"),
				),
			).toBe(false);
		});

		it("gives the same routes when called twice on the same input", () => {
			// Two rows of three boxes, where routing again changes routes and the order
			// the edges are routed again in would change them further.
			const grid = [0, 1, 2, 3, 4, 5].map((index) =>
				box(`n${index}`, (index % 3) * 150, Math.floor(index / 3) * 120),
			);
			const edges = [
				edge("e0", "n3", "n0"),
				edge("e1", "n3", "n4"),
				edge("e2", "n2", "n3"),
				edge("e3", "n1", "n2"),
				edge("e4", "n0", "n5"),
				edge("e5", "n1", "n4"),
			];

			const first = routeEdgesAroundNodes(grid, edges);
			const second = routeEdgesAroundNodes(grid, edges);

			expect(second).toEqual(first);
		});

		it("routes two edges given one id", () => {
			const result = routeEdgesAroundNodes(nodes, [
				edge("twin", "a", "b"),
				edge("twin", "u", "m"),
			]);

			expect(result.unroutedEdgeIds).toEqual([]);
			expect(result.edges).toHaveLength(2);
		});
	});

	describe("fanning the ends that share a side", () => {
		it("fans two ends stage one puts on one spot, rewriting each one's t", () => {
			// Two boxes in a column below and to the right, none facing a, and a wall
			// against a's right side: both edges leave a's bottom centre.
			const ys = [100, 200];
			const nodes = [
				box("a", 0, 0),
				...ys.map((y, index) => box(`t${index}`, 300, y)),
			];
			const result = routeEdgesAroundNodes(
				nodes,
				ys.map((_, index) => edge(`e${index}`, "a", `t${index}`)),
				{ obstacles: [{ x: 60, y: 0, width: 40, height: 40 }] },
			);

			const onBottom = result.edges.filter(
				({ source }) => source.side === "bottom",
			);
			// The one turning off first, toward the boxes, takes the side nearer them.
			expect(onBottom.map(({ id, source }) => [id, source.t])).toEqual([
				["e0", 40 / 60],
				["e1", 20 / 60],
			]);
			for (const routed of onBottom) {
				expect(routed.points[0].x).toBe(
					calcAnchorPoint(nodes[0].bounds, routed.source).x,
				);
			}
		});

		it("keeps the ends sharing a side within the stretch a layered layout fans them over", () => {
			// Six boxes in a column to the right, none facing a: three edges leave a's
			// bottom, whose fan stretch 4..36 shares 32px as two gaps of 16.
			const ys = [-300, -200, -100, 100, 200, 300];
			const nodes = [
				box("a", 0, 0, 40),
				...ys.map((y, index) => box(`t${index}`, 300, y)),
			];
			const result = routeEdgesAroundNodes(
				nodes,
				ys.map((_, index) => edge(`e${index}`, "a", `t${index}`)),
			);

			const onBottom = result.edges.filter(
				({ source }) => source.side === "bottom",
			);
			expect(
				onBottom.map(({ source }) =>
					Math.round(calcAnchorPoint(nodes[0].bounds, source).x),
				),
			).toEqual([36, 20, 4]);
		});

		it("fans ends leaving a bottom side through the box's own caption", () => {
			// Obstacles against a's other three sides leave only its bottom, which runs
			// through its caption.
			const nodes: RoutableNode[] = [
				{
					...box("a", 0, 0),
					labelBounds: { x: -10, y: 44, width: 80, height: 16 },
				},
				box("left", -200, 300),
				box("right", 260, 300),
			];
			const result = routeEdgesAroundNodes(
				nodes,
				[edge("e0", "a", "left"), edge("e1", "a", "right")],
				{
					obstacles: [
						{ x: -40, y: -40, width: 140, height: 40 },
						{ x: -40, y: 0, width: 40, height: 40 },
						{ x: 60, y: 0, width: 40, height: 40 },
					],
				},
			);

			expect(result.edges.map(({ source }) => source)).toEqual([
				{ side: "bottom", t: 20 / 60 },
				{ side: "bottom", t: 40 / 60 },
			]);
		});

		it("keeps an end off its box's caption on a side other than the bottom", () => {
			// a is 20px tall, its left side fanning ends over y 2..18; its caption hangs
			// 2px below and reaches past the left side. Obstacles against a's other sides
			// put both ends on its left, where the end turning down to c is pushed toward
			// the caption.
			const nodes: RoutableNode[] = [
				{
					...box("a", 0, 0, 60, 20),
					labelBounds: { x: -20, y: 22, width: 100, height: 14 },
				},
				box("b", -300, -200),
				box("c", -300, 200),
			];
			const result = routeEdgesAroundNodes(
				nodes,
				[edge("up", "a", "b"), edge("down", "a", "c")],
				{
					obstacles: [
						{ x: -10, y: -40, width: 80, height: 40 },
						{ x: 60, y: -40, width: 40, height: 80 },
						{ x: -10, y: 36, width: 80, height: 30 },
					],
				},
			);

			const [up, down] = result.edges;
			expect([up.source.side, down.source.side]).toEqual(["left", "left"]);
			// Half the lane spacing above the caption's top, at y 22.
			expect(calcAnchorPoint(nodes[0].bounds, down.source).y).toBe(14);
		});

		it("keeps the t of an end that does not move exactly as stage one gave it", () => {
			// 0.5 of this side, measured back from the point it lands on, is not 0.5.
			const result = routeEdgesAroundNodes(
				[box("a", 0, 10.3, 60, 60.3), box("b", 300, 10.3, 60, 60.3)],
				[edge("e", "a", "b")],
			);

			expect(result.edges[0]).toMatchObject({
				source: { side: "right", t: 0.5 },
				target: { side: "left", t: 0.5 },
			});
		});
	});

	describe("placing labels", () => {
		it("places the label of an edge given one on its finished route, and none for another", () => {
			const result = routeEdgesAroundNodes(
				[
					box("a", 0, 0),
					box("b", 300, 0),
					box("c", 0, 200),
					box("d", 300, 200),
				],
				[
					{ ...edge("labelled", "a", "b"), label: { width: 40, height: 20 } },
					edge("plain", "c", "d"),
				],
			);

			expect(result.edges[0]).toMatchObject({
				labelPosition: 0.5,
				labelOffset: 0,
			});
			expect(result.edges[1]).not.toHaveProperty("labelPosition");
			expect(result.edges[1]).not.toHaveProperty("labelOffset");
		});

		it("keeps a label off the caption of a box its route passes", () => {
			// The caption hangs 8px above the line's middle, where the label would cover
			// its bottom; the label moves along the line instead.
			const nodes: RoutableNode[] = [
				box("a", 0, 0),
				box("b", 400, 0),
				{
					...box("c", 200, -60),
					labelBounds: { x: 190, y: -2, width: 80, height: 14 },
				},
			];
			const result = routeEdgesAroundNodes(nodes, [
				{ ...edge("e", "a", "b"), label: { width: 40, height: 20 } },
			]);

			const routed = result.edges[0];
			const path = pathOf(routed, nodes, "a", "b");
			const centre = calcAnchorPoint(nodes[0].bounds, routed.source);
			const length = path
				.slice(1)
				.reduce(
					(sum, point, index) =>
						sum +
						Math.abs(point.x - path[index].x) +
						Math.abs(point.y - path[index].y),
					0,
				);
			expect(routed.points).toEqual([]);
			expect(routed.labelOffset).toBe(0);
			const labelX = centre.x + (routed.labelPosition as number) * length;
			// Its box, 40 wide, clears the caption's 190..270 on one side.
			expect(labelX + 20 <= 190 || labelX - 20 >= 270).toBe(true);
		});
	});

	describe("spreading routes that run together", () => {
		const nodes = [
			box("a1", 0, 0),
			box("a2", 200, 0),
			box("b1", 0, 400),
			box("b2", 200, 400),
		];
		const edges = [edge("left", "a1", "b1"), edge("right", "a2", "b2")];
		/** Two walls across the way down, leaving a gap from x 100 to `gapRight`. */
		const wallsWithGapTo = (gapRight: number): Rect[] => [
			{ x: -400, y: 180, width: 500, height: 40 },
			{ x: gapRight, y: 180, width: 400, height: 40 },
		];
		/** The x each route crosses the walls' band at. */
		const listGapCrossings = (routed: readonly RoutedEdge[]) =>
			routed.map(
				({ points }) =>
					points.find(
						(point, index) =>
							index > 0 &&
							point.x === points[index - 1].x &&
							Math.min(point.y, points[index - 1].y) <= 180 &&
							Math.max(point.y, points[index - 1].y) >= 220,
					)?.x,
			);

		it("spreads two routes running on one line through a gap exactly the spacing apart", () => {
			// Both are routed down the gap's middle, x 130.
			const result = routeEdgesAroundNodes(nodes, edges, {
				obstacles: wallsWithGapTo(160),
			});

			expect(listGapCrossings(result.edges)).toEqual([122, 138]);
		});

		it("stops the spread half the spacing short of an obstacle", () => {
			// Routed down x 115, between walls at 100 and 130.
			const result = routeEdgesAroundNodes(nodes, edges, {
				obstacles: wallsWithGapTo(130),
			});

			expect(listGapCrossings(result.edges)).toEqual([108, 122]);
		});

		it("stops the spread half the spacing short of a border's side", () => {
			// Routed down x 130, between the border's sides at 118 and 142.
			const result = routeEdgesAroundNodes(nodes, edges, {
				obstacles: wallsWithGapTo(160),
				borders: [{ x: 118, y: 150, width: 24, height: 100 }],
			});

			expect(listGapCrossings(result.edges)).toEqual([126, 134]);
		});

		it("spreads runs lying inside an obstacle that covers their end boxes", () => {
			const result = routeEdgesAroundNodes(nodes, edges, {
				obstacles: [
					...wallsWithGapTo(160),
					{ x: -20, y: -20, width: 300, height: 320 },
				],
			});

			expect(listGapCrossings(result.edges)).toEqual([122, 138]);
		});
	});

	describe("crossing a title band", () => {
		/** Whether no horizontal run lies within the band's y-extent, edges included, nor any corner in the band. */
		const keepsOffBand = (path: readonly Point[], band: Rect): boolean => {
			const isWithinBandY = (y: number): boolean =>
				y >= band.y && y <= band.y + band.height;
			const isInBand = ({ x, y }: Point): boolean =>
				x >= band.x && x <= band.x + band.width && isWithinBandY(y);
			const runsAlong = segmentsOf(path).some(
				([start, end]) =>
					start.y === end.y &&
					Math.max(start.x, end.x) > band.x &&
					Math.min(start.x, end.x) < band.x + band.width &&
					isWithinBandY(start.y),
			);
			return !runsAlong && !path.slice(1, -1).some(isInBand);
		};

		it("crosses a band straight over where the same rect as an obstacle forces a detour", () => {
			const nodes = [box("a", 0, 0), box("b", 0, 300)];
			const band = { x: -200, y: 140, width: 500, height: 30 };

			const crossed = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
				crossableBands: [band],
			});
			const avoided = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
				obstacles: [band],
			});

			expect(crossed).toEqual({
				edges: [
					{
						id: "e",
						source: { side: "bottom", t: 0.5 },
						target: { side: "top", t: 0.5 },
						points: [],
					},
				],
				unroutedEdgeIds: [],
			});
			expect(avoided.edges[0].points.length).toBeGreaterThan(0);
		});

		it("neither runs along nor bends inside a band lying where the cheapest way would", () => {
			// a's caption makes its bottom side dearer, so without the band the route
			// leaves a's right side along y 20 and turns down at x 330, both inside the
			// band.
			const nodes: RoutableNode[] = [
				{
					...box("a", 0, 0),
					labelBounds: { x: 10, y: 44, width: 40, height: 20 },
				},
				box("b", 300, 300),
			];
			const band = { x: 100, y: 0, width: 400, height: 40 };

			const plain = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")]);
			const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
				crossableBands: [band],
			});

			expect(keepsOffBand(pathOf(plain.edges[0], nodes, "a", "b"), band)).toBe(
				false,
			);
			expect(result.unroutedEdgeIds).toEqual([]);
			const path = pathOf(result.edges[0], nodes, "a", "b");
			expect(isRightAngled(path)).toBe(true);
			expect(keepsOffBand(path, band)).toBe(true);
		});

		it("runs along no band's inside even where its sides lie beyond the margin", () => {
			// The straight way along y 20 runs 50px off either side of the band.
			const nodes = [box("a", 0, 0), box("b", 400, 0)];
			const band = { x: 100, y: -30, width: 200, height: 100 };

			const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
				crossableBands: [band],
			});

			expect(result.unroutedEdgeIds).toEqual([]);
			expect(keepsOffBand(pathOf(result.edges[0], nodes, "a", "b"), band)).toBe(
				true,
			);
		});

		it("stops a stub heading for a band nearer than two margins halfway to it", () => {
			// Walls against a's other three sides leave its bottom, 40px above the band.
			const walls = [
				{ x: -40, y: -40, width: 140, height: 40 },
				{ x: -40, y: -40, width: 40, height: 80 },
				{ x: 60, y: -40, width: 40, height: 80 },
			];
			const band = { x: -100, y: 80, width: 200, height: 30 };
			const nodes = [box("a", 0, 0), box("b", 300, 20)];

			const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
				obstacles: walls,
				crossableBands: [band],
			});

			// It turns at y 60, before the band, and on up to b's left side.
			const routed = result.edges[0];
			expect(routed.source).toEqual({ side: "bottom", t: 0.5 });
			expect(routed.points[0]).toEqual({ x: 30, y: 60 });
			expect(keepsOffBand(pathOf(routed, nodes, "a", "b"), band)).toBe(true);
		});

		it("drops an end that would start inside a band, routing through another side", () => {
			// The band runs across a's middle, so a's left and right ends would start in it.
			const nodes = [box("a", 0, 0), box("b", 400, 0)];
			const band = { x: -200, y: 10, width: 400, height: 20 };

			const plain = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")]);
			const result = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
				crossableBands: [band],
			});

			expect(plain.edges[0].source.side).toBe("right");
			expect(result.unroutedEdgeIds).toEqual([]);
			expect(["top", "bottom"]).toContain(result.edges[0].source.side);
			expect(keepsOffBand(pathOf(result.edges[0], nodes, "a", "b"), band)).toBe(
				true,
			);
		});

		it("reports an edge unrouted when a band covering its box leaves no end, and routes the others", () => {
			const result = routeEdgesAroundNodes(
				[box("a", 0, 0), box("b", 400, 0), box("c", 0, 300)],
				[edge("covered", "a", "b"), edge("open", "b", "c")],
				{ crossableBands: [{ x: -200, y: -10, width: 400, height: 60 }] },
			);

			expect(result.unroutedEdgeIds).toEqual(["covered"]);
			expect(result.edges.map(({ id }) => id)).toEqual(["open"]);
		});

		it("takes a band reaching far beyond every node as it takes one that does not", () => {
			const band = { x: -100_000, y: 120, width: 200_000, height: 60 };
			const below = [box("a", 0, 0), box("b", 0, 300)];
			const aside = [box("a", 0, 0), box("b", 300, 300)];

			const straight = routeEdgesAroundNodes(below, [edge("e", "a", "b")], {
				crossableBands: [band],
			});
			const turning = routeEdgesAroundNodes(aside, [edge("e", "a", "b")], {
				crossableBands: [band],
			});

			expect(straight.edges[0]).toMatchObject({
				source: { side: "bottom" },
				target: { side: "top" },
				points: [],
			});
			expect(turning.unroutedEdgeIds).toEqual([]);
			expect(
				keepsOffBand(pathOf(turning.edges[0], aside, "a", "b"), band),
			).toBe(true);
		});

		it("goes round a band reaching above and below every line the nodes give", () => {
			const nodes = [box("a", 0, 0), box("b", 400, 0)];
			const band = { x: 100, y: -100, width: 200, height: 240 };

			const crossed = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
				crossableBands: [band],
			});
			const avoided = routeEdgesAroundNodes(nodes, [edge("e", "a", "b")], {
				obstacles: [band],
			});

			expect(avoided.unroutedEdgeIds).toEqual([]);
			expect(crossed.unroutedEdgeIds).toEqual([]);
			expect(
				keepsOffBand(pathOf(crossed.edges[0], nodes, "a", "b"), band),
			).toBe(true);
		});

		it("keeps an edge's label out of a band its route crosses", () => {
			// Without the band the label sits at the route's middle, y 170.
			const nodes = [box("a", 0, 0), box("b", 0, 300)];
			const band = { x: -200, y: 150, width: 500, height: 40 };
			const labelled = {
				...edge("e", "a", "b"),
				label: { width: 40, height: 20 },
			};

			const plain = routeEdgesAroundNodes(nodes, [labelled]);
			const result = routeEdgesAroundNodes(nodes, [labelled], {
				crossableBands: [band],
			});

			expect(plain.edges[0].labelPosition).toBe(0.5);
			const routed = result.edges[0];
			expect(routed.points).toEqual([]);
			expect(routed.labelOffset).toBe(0);
			const [start, end] = pathOf(routed, nodes, "a", "b");
			const labelY =
				start.y + (routed.labelPosition as number) * (end.y - start.y);
			// Its box, 20 tall, clears the band's 150..190 on one side.
			expect(labelY + 10 <= 150 || labelY - 10 >= 190).toBe(true);
		});
	});

	describe("ends held to given places", () => {
		it("starts at the place given, its t exactly as given, though another side is cheaper", () => {
			const result = routeEdgesAroundNodes(
				[box("a", 0, 0), box("b", 300, 0)],
				[{ ...edge("e", "a", "b"), sourceEnds: [{ side: "top", t: 0.3 }] }],
			);

			const routed = result.edges[0];
			expect(routed.source.side).toBe("top");
			expect(routed.source.t).toBe(0.3);
			expect(routed.points[0].x).toBe(18);
		});

		it("ends at the place given for the target too", () => {
			const result = routeEdgesAroundNodes(
				[box("a", 0, 0), box("b", 300, 0)],
				[
					{
						...edge("e", "a", "b"),
						targetEnds: [{ side: "bottom", t: 0.7 }],
					},
				],
			);

			const routed = result.edges[0];
			expect(routed.target.side).toBe("bottom");
			expect(routed.target.t).toBe(0.7);
		});

		it("takes, of two places given, the one that gives the cheaper way", () => {
			const sides = [
				{ side: "left", t: 0.5 },
				{ side: "right", t: 0.5 },
			] as const;
			const toRight = routeEdgesAroundNodes(
				[box("a", 0, 0), box("b", 300, 100)],
				[{ ...edge("e", "a", "b"), sourceEnds: sides }],
			);
			const toLeft = routeEdgesAroundNodes(
				[box("a", 0, 0), box("b", -300, 100)],
				[{ ...edge("e", "a", "b"), sourceEnds: sides }],
			);

			expect(toRight.edges[0].source).toEqual({ side: "right", t: 0.5 });
			expect(toLeft.edges[0].source).toEqual({ side: "left", t: 0.5 });
		});

		it("keeps pinned ends exactly where given while free ends on their side slide", () => {
			// Walls against T's other three sides put every end on its left. The two
			// pinned ends from above and the free ends from below all reach for its
			// centre, y 40; free to slide, the pinned ends would give way upward.
			const pinned = { targetEnds: [{ side: "left", t: 0.5 }] as const };
			const result = routeEdgesAroundNodes(
				[
					box("p", 0, -200),
					box("q", 100, -200),
					box("f", 0, 300),
					box("g", 100, 300),
					box("T", 400, 0, 60, 80),
				],
				[
					{ ...edge("p", "p", "T"), ...pinned },
					{ ...edge("q", "q", "T"), ...pinned },
					edge("f", "f", "T"),
					edge("g", "g", "T"),
				],
				{
					obstacles: [
						{ x: 380, y: -40, width: 120, height: 40 },
						{ x: 460, y: -40, width: 40, height: 160 },
						{ x: 380, y: 80, width: 120, height: 40 },
					],
				},
			);

			const [p, q, f, g] = result.edges;
			expect(p.target).toEqual({ side: "left", t: 0.5 });
			expect(q.target).toEqual({ side: "left", t: 0.5 });
			for (const free of [f, g]) {
				expect(free.target.side).toBe("left");
				expect(free.target.t).toBeGreaterThan(0.5);
			}
		});

		it("drops a place whose stub is blocked and starts at another given", () => {
			// A wall flush against a's right side blocks the right place.
			const result = routeEdgesAroundNodes(
				[box("a", 0, 0), box("b", 300, 0)],
				[
					{
						...edge("e", "a", "b"),
						sourceEnds: [
							{ side: "right", t: 0.5 },
							{ side: "top", t: 0.5 },
						],
					},
				],
				{ obstacles: [{ x: 60, y: -20, width: 20, height: 80 }] },
			);

			expect(result.unroutedEdgeIds).toEqual([]);
			expect(result.edges[0].source).toEqual({ side: "top", t: 0.5 });
		});

		it("reports an edge unrouted when no place given is left, and routes the others", () => {
			const nodes = [box("a", 0, 0), box("b", 300, 0), box("c", 0, 300)];
			const blocked = routeEdgesAroundNodes(
				nodes,
				[
					{
						...edge("pinned", "a", "b"),
						sourceEnds: [{ side: "right", t: 0.5 }],
					},
					edge("free", "a", "c"),
				],
				{ obstacles: [{ x: 60, y: -20, width: 20, height: 80 }] },
			);
			const none = routeEdgesAroundNodes(nodes, [
				{ ...edge("pinned", "a", "b"), sourceEnds: [] },
				edge("free", "a", "c"),
			]);

			for (const result of [blocked, none]) {
				expect(result.unroutedEdgeIds).toEqual(["pinned"]);
				expect(result.edges.map(({ id }) => id)).toEqual(["free"]);
			}
		});

		it("runs the free end straight to a pinned place off the other box's centre", () => {
			// T's left side is centred at y 100, out of a's reach; the pinned place at
			// y 32 lies within a's right side, past the stretch its end slides over.
			const result = routeEdgesAroundNodes(
				[box("a", 0, 30), box("T", 300, 0, 60, 200)],
				[
					{
						...edge("e", "a", "T"),
						targetEnds: [{ side: "left", t: 0.16 }],
					},
				],
			);

			expect(result.edges[0]).toEqual({
				id: "e",
				source: { side: "right", t: 0.05 },
				target: { side: "left", t: 0.16 },
				points: [],
			});
		});

		it("spreads the free ends of a side as it does without the pinned ends there", () => {
			// Walls against T's other three sides put every end on its left, whose fan
			// stretch 8..72 the three free ends share; counted in, the two pinned ends
			// would shrink their gap.
			const walls = [
				{ x: 380, y: -40, width: 120, height: 40 },
				{ x: 460, y: -40, width: 40, height: 160 },
				{ x: 380, y: 80, width: 120, height: 40 },
			];
			const nodes = [
				box("T", 400, 0, 60, 80),
				box("f0", 0, -300),
				box("f1", 0, 20),
				box("f2", 0, 300),
				box("p0", 0, -500),
				box("p1", 200, -500),
			];
			const free = [
				edge("f0", "f0", "T"),
				edge("f1", "f1", "T"),
				edge("f2", "f2", "T"),
			];
			const pinned = { targetEnds: [{ side: "left", t: 0 }] as const };

			const withPinned = routeEdgesAroundNodes(
				nodes,
				[
					...free,
					{ ...edge("p0", "p0", "T"), ...pinned },
					{ ...edge("p1", "p1", "T"), ...pinned },
				],
				{ obstacles: walls },
			);
			const withoutPinned = routeEdgesAroundNodes(nodes, free, {
				obstacles: walls,
			});

			const freeTargets = (edges: readonly RoutedEdge[]) =>
				edges
					.filter(({ id }) => id.startsWith("f"))
					.map(({ target }) => target);
			expect(freeTargets(withPinned.edges)).toEqual(
				freeTargets(withoutPinned.edges),
			);
			expect(
				freeTargets(withoutPinned.edges).map((target) => [
					target.side,
					calcAnchorPoint(nodes[0].bounds, target).y,
				]),
			).toEqual([
				["left", 20],
				["left", 40],
				["left", 60],
			]);
		});
	});

	describe("gathering the routes to one pinned place", () => {
		// T's left side is pinned at y 150; the boxes on the left reach it from above
		// and below.
		const pinned = { targetEnds: [{ side: "left", t: 0.5 }] as const };
		const target = box("T", 400, 0, 60, 300);
		const pinnedAt = { x: 400, y: 150 };

		it("runs the routes to one pinned place along one shared trunk into it", () => {
			const nodes = [
				box("s1", 0, -100),
				box("s2", 0, 100),
				box("s3", 0, 300),
				target,
			];
			const result = routeEdgesAroundNodes(nodes, [
				{ ...edge("p1", "s1", "T"), ...pinned },
				{ ...edge("p2", "s2", "T"), ...pinned },
				{ ...edge("p3", "s3", "T"), ...pinned },
			]);

			expect(result.unroutedEdgeIds).toEqual([]);
			const lastSegments = result.edges.map((routed) => {
				const path = pathOf(routed, nodes, routed.id.replace("p", "s"), "T");
				return [path[path.length - 2], path[path.length - 1]] as const;
			});
			for (const [start, end] of lastSegments) {
				expect(end).toEqual(pinnedAt);
				expect(start.y).toBe(pinnedAt.y);
			}
			const sharedFrom = Math.max(...lastSegments.map(([start]) => start.x));
			expect(pinnedAt.x - sharedFrom).toBeGreaterThan(EDGE_ROUTE_MARGIN);
			// The two from the left side's boxes join before the trunk: their runs down
			// to it share a stretch on one line.
			const [p1, p2] = result.edges;
			expect(p1.points[0].x).toBe(p1.points[1].x);
			expect(p2.points[0].x).toBe(p1.points[0].x);
			expect(p2.points[1]).toEqual(p1.points[1]);
		});

		it("gathers into one trunk the routes to one pinned place where the first one routed joins a later one's", () => {
			// Routed alone, p1 comes down to the trunk at x 90; p2 then comes straight
			// down from s2, at x 280, and routed again p1 joins it there.
			const nodes = [
				box("s1", -100, -100),
				box("s2", 250, -200),
				box("s3", 0, 100),
				target,
			];
			const result = routeEdgesAroundNodes(nodes, [
				{ ...edge("p1", "s1", "T"), ...pinned },
				{ ...edge("p2", "s2", "T"), ...pinned },
				{ ...edge("p3", "s3", "T"), ...pinned },
			]);

			expect(result.unroutedEdgeIds).toEqual([]);
			const lastSegments = result.edges.map((routed) =>
				pathOf(routed, nodes, routed.id.replace("p", "s"), "T").slice(-2),
			);
			expect(lastSegments[0]).toEqual([{ x: 280, y: pinnedAt.y }, pinnedAt]);
			expect(lastSegments[1]).toEqual(lastSegments[0]);
			expect(lastSegments[2]).toEqual(lastSegments[0]);
		});

		it("keeps a free route the lane spacing off a trunk it runs alongside", () => {
			// Routed first, the free edge runs straight from g into T's left side; the
			// trunk then comes in beside it.
			const nodes = [
				box("s1", 0, -100),
				box("s2", 0, 100),
				box("g", -200, 130),
				target,
			];
			const result = routeEdgesAroundNodes(nodes, [
				edge("free", "g", "T"),
				{ ...edge("p1", "s1", "T"), ...pinned },
				{ ...edge("p2", "s2", "T"), ...pinned },
			]);

			expect(result.unroutedEdgeIds).toEqual([]);
			const [free, ...bundle] = result.edges;
			const freeSegments = segmentsOf(pathOf(free, nodes, "g", "T"));
			const trunkSegments = bundle.flatMap((routed) =>
				segmentsOf(pathOf(routed, nodes, routed.id.replace("p", "s"), "T")),
			);
			let alongsideCount = 0;
			for (const freeSegment of freeSegments) {
				for (const trunkSegment of trunkSegments) {
					const isHorizontal = freeSegment[0].y === freeSegment[1].y;
					if (
						isHorizontal !== (trunkSegment[0].y === trunkSegment[1].y) ||
						calcSharedStretch(freeSegment, trunkSegment, isHorizontal) <= 0
					) {
						continue;
					}
					alongsideCount += 1;
					const across = (point: Point): number =>
						isHorizontal ? point.y : point.x;
					expect(
						Math.abs(across(freeSegment[0]) - across(trunkSegment[0])),
					).toBeGreaterThanOrEqual(GAP_LANE_SPACING);
				}
			}
			expect(alongsideCount).toBeGreaterThan(0);
		});
	});
	describe("a hollow node", () => {
		it("lets another edge's route through its box, where the same box not hollow forces a detour", () => {
			const scene = (frame: RoutableNode) => [
				box("a", 0, 0),
				box("b", 400, 0),
				frame,
			];

			const throughHollow = routeEdgesAroundNodes(
				scene(hollowBox("H", 150, -100, 150, 240)),
				[edge("e", "a", "b")],
			);
			const aroundSolid = routeEdgesAroundNodes(
				scene(box("H", 150, -100, 150, 240)),
				[edge("e", "a", "b")],
			);

			expect(throughHollow.edges[0]).toMatchObject({
				source: { side: "right", t: 0.5 },
				target: { side: "left", t: 0.5 },
				points: [],
			});
			expect(aroundSolid.edges[0].points).not.toEqual([]);
		});

		it("ends an edge on its side from outside, entering neither its box nor a node inside it, though the facing side is walled off", () => {
			// Walls against H's top and bottom and across the middle of its right side
			// leave its left side, which the route reaches around the outside.
			const nodes = [
				hollowBox("H", 0, 0, 300, 200),
				box("inner", 120, 80),
				box("o", 500, 80),
			];
			const result = routeEdgesAroundNodes(nodes, [edge("e", "o", "H")], {
				obstacles: [
					{ x: -50, y: -20, width: 400, height: 20 },
					{ x: -50, y: 200, width: 400, height: 20 },
					{ x: 300, y: 60, width: 20, height: 80 },
				],
			});

			expect(result.unroutedEdgeIds).toEqual([]);
			const routed = result.edges[0];
			expect(routed.target).toEqual({ side: "left", t: 0.5 });
			const path = pathOf(routed, nodes, "o", "H");
			expect(entersRect(path, nodes[0].bounds)).toBe(false);
			expect(entersRect(path, nodes[1].bounds)).toBe(false);
		});

		it("spreads the ends on its top side with an obstacle lying inside along it, such as a title band, as it does without", () => {
			// Walls against H's other three sides put both ends on its top, reaching for
			// its centre from far off either way.
			const nodes = [
				hollowBox("H", 0, 0, 300, 200),
				box("s1", -300, -300),
				box("s2", 540, -300),
			];
			const edges = [edge("e1", "s1", "H"), edge("e2", "s2", "H")];
			const walls = [
				{ x: -40, y: 0, width: 40, height: 240 },
				{ x: 300, y: 0, width: 40, height: 240 },
				{ x: -40, y: 200, width: 380, height: 40 },
			];
			const titleBand = { x: 0, y: 0, width: 300, height: 30 };

			const withBand = routeEdgesAroundNodes(nodes, edges, {
				obstacles: [...walls, titleBand],
			});
			const withoutBand = routeEdgesAroundNodes(nodes, edges, {
				obstacles: walls,
			});

			const targetsOf = (routed: readonly RoutedEdge[]) =>
				routed.map(({ target }) => target);
			expect(targetsOf(withBand.edges)).toEqual(targetsOf(withoutBand.edges));
			expect(
				targetsOf(withBand.edges).map((target) => [
					target.side,
					calcAnchorPoint(nodes[0].bounds, target).x,
				]),
			).toEqual([
				["top", 140],
				["top", 160],
			]);
		});

		it("routes its edge through an obstacle covering it and more, such as a backdrop", () => {
			const result = routeEdgesAroundNodes(
				[hollowBox("H", 0, 0, 300, 200), box("o", 500, 80)],
				[edge("e", "o", "H")],
				{ obstacles: [{ x: -50, y: -50, width: 400, height: 300 }] },
			);

			expect(result).toEqual({
				edges: [
					{
						id: "e",
						source: { side: "left", t: 0.5 },
						target: { side: "right", t: 0.5 },
						points: [],
					},
				],
				unroutedEdgeIds: [],
			});
		});

		it("reports an edge between it and a node inside it as unrouted", () => {
			const nodes = [hollowBox("H", 0, 0, 300, 200), box("inner", 120, 80)];

			for (const routed of [
				edge("out", "H", "inner"),
				edge("in", "inner", "H"),
			]) {
				expect(routeEdgesAroundNodes(nodes, [routed])).toEqual({
					edges: [],
					unroutedEdgeIds: [routed.id],
				});
			}
		});

		it("places a label without keeping off its box", () => {
			// H stands across the line's middle, where the label sits with no H at all.
			const labelled = {
				...edge("e", "a", "b"),
				label: { width: 40, height: 20 },
			};
			const ends = [box("a", 0, 0), box("b", 400, 0)];

			const withHollow = routeEdgesAroundNodes(
				[...ends, hollowBox("H", 200, -60, 80, 140)],
				[labelled],
			);
			const withoutNode = routeEdgesAroundNodes(ends, [labelled]);

			expect(withoutNode.edges[0]).toMatchObject({
				labelPosition: 0.5,
				labelOffset: 0,
			});
			expect(withHollow).toEqual(withoutNode);
		});
	});

	describe("ends beside the centre", () => {
		const facingPair = [box("a", 0, 0), box("b", 300, 0)];
		/** The contended sides when two edges join `source` and `target`. */
		const twiceBetween = (
			source: RoutableNode,
			target: RoutableNode,
		): Set<string> =>
			listContendedSideKeys([
				{ source, target },
				{ source, target },
			]);
		const twoEdges = [edge("first", "a", "b"), edge("second", "a", "b")];

		it("runs a second edge between two facing boxes straight beside the first", () => {
			const result = routeEdgesAroundNodes(facingPair, twoEdges);

			expect(result.unroutedEdgeIds).toEqual([]);
			const [first, second] = result.edges;
			for (const routed of [first, second]) {
				expect(routed).toMatchObject({
					source: { side: "right" },
					target: { side: "left" },
					points: [],
				});
			}
			expect(second.source.t).not.toBe(first.source.t);
		});

		it("still runs a lone edge from the centre where a spot beside it runs straight too", () => {
			const result = routeEdgesAroundNodes(
				[box("a", 0, 0, 60, 120), box("b", 300, 0, 60, 120)],
				[edge("e", "a", "b")],
			);

			expect(result.edges[0]).toMatchObject({
				source: { side: "right", t: 0.5 },
				target: { side: "left", t: 0.5 },
				points: [],
			});
		});

		it("does not run a second edge straight past obstacles within the margin of either spot beside the centre", () => {
			// 35px off the centre line, 19px off the line 16px to either side of it.
			const result = routeEdgesAroundNodes(facingPair, twoEdges, {
				obstacles: [
					{ x: 150, y: -40, width: 40, height: 25 },
					{ x: 150, y: 55, width: 40, height: 25 },
				],
			});

			const [first, second] = result.edges;
			expect(first.points).toEqual([]);
			expect(second.points).not.toEqual([]);
		});

		it("does not run a second edge straight along borders' sides within the margin of either spot beside the centre", () => {
			const result = routeEdgesAroundNodes(facingPair, twoEdges, {
				borders: [
					{ x: 150, y: -100, width: 40, height: 85 },
					{ x: 150, y: 55, width: 40, height: 85 },
				],
			});

			const [first, second] = result.edges;
			expect(first.points).toEqual([]);
			expect(second.points).not.toEqual([]);
		});

		it("offers spots beside the centre only to an end whose edge has both ends free", () => {
			const [a, b] = facingPair;
			const listRightSide = (
				pinnedEnds?: readonly LayoutEdgeAnchor[],
				otherPinnedEnds?: readonly LayoutEdgeAnchor[],
			) =>
				listEndCandidates(
					a,
					b,
					[],
					new Set(),
					[],
					[],
					twiceBetween(a, b),
					pinnedEnds,
					otherPinnedEnds,
				)
					.filter(({ side }) => side === "right")
					.map(({ t, sideCost }) => ({ t, sideCost }));
			const centre = [{ side: "left", t: 0.5 }] as const;

			// 16px either side of y 20, a little dearer than the centre.
			expect(listRightSide()).toEqual([
				{ t: 0.5, sideCost: 0 },
				{ t: 0.1, sideCost: 1 },
				{ t: 0.9, sideCost: 1 },
			]);
			expect(listRightSide(undefined, centre)).toEqual([
				{ t: 0.5, sideCost: 0 },
			]);
			expect(listRightSide([{ side: "right", t: 0.5 }], undefined)).toEqual([
				{ t: 0.5, sideCost: 0 },
			]);
		});

		it("offers spots beside the centre only on a side two edges have their other box beyond", () => {
			const [a, b] = facingPair;
			const above = box("c", 300, -300);
			const listBesideOnRight = (contendedSideKeys: ReadonlySet<string>) =>
				listEndCandidates(a, b, [], new Set(), [], [], contendedSideKeys)
					.filter(({ side, sideCost }) => side === "right" && sideCost > 0)
					.map(({ t }) => t);
			const between = (source: RoutableNode, target: RoutableNode) => ({
				source,
				target,
			});

			// One edge alone, and two leaving a by different sides of b: no side is wanted twice.
			expect(listBesideOnRight(listContendedSideKeys([between(a, b)]))).toEqual(
				[],
			);
			// b and c both lie beyond a's right side.
			expect(
				listBesideOnRight(
					listContendedSideKeys([between(a, b), between(above, a)]),
				),
			).toEqual([0.1, 0.9]);
			// The contended side may be the other box's: two edges reach b's left side.
			const left = box("d", -300, 300);
			expect(
				listBesideOnRight(
					listContendedSideKeys([between(a, b), between(b, left)]),
				),
			).toEqual([0.1, 0.9]);
		});

		it("offers no horizontal run inside a crossable band's strip, where a vertical one is still offered", () => {
			// Each band spans exactly the margin either side of the spot 16px past the
			// centre (y 36, x 46), its sides no nearer than the margin.
			const [a, b] = facingPair;
			const below = box("c", 0, 300);
			const listBeside = (
				other: RoutableNode,
				band: BoundingBox,
				side: LayoutSide,
			) =>
				listEndCandidates(
					a,
					other,
					[],
					new Set(),
					[band],
					[],
					twiceBetween(a, other),
				)
					.filter(
						(candidate) => candidate.side === side && candidate.sideCost > 0,
					)
					.map(({ t }) => t);

			expect(
				listBeside(b, { left: 100, right: 200, top: 6, bottom: 66 }, "right"),
			).toEqual([]);
			expect(
				listBeside(
					below,
					{ left: 16, right: 76, top: 100, bottom: 200 },
					"bottom",
				),
			).toEqual([46 / 60]);
		});
	});
});
