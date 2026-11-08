import type { Point, Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { calcAnchorPoint } from "../calcOrthogonalPath";
import { EDGE_ROUTE_MARGIN } from "../edgeRoutingCosts";
import { routeEdgesAroundNodes } from "../routeEdgesAroundNodes";
import type { RoutableNode, RoutedEdge } from "../types";

const box = (
	id: string,
	x: number,
	y: number,
	width = 60,
	height = 40,
): RoutableNode => ({ id, bounds: { x, y, width, height } });

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

	describe("fanning the ends that share a side", () => {
		it("fans two ends stage one puts on one spot, rewriting each one's t", () => {
			// Five boxes in a column to the right: two edges leave a's bottom centre.
			const ys = [-300, -150, 0, 150, 300];
			const nodes = [
				box("a", 0, 0),
				...ys.map((y, index) => box(`t${index}`, 300, y)),
			];
			const result = routeEdgesAroundNodes(
				nodes,
				ys.map((_, index) => edge(`e${index}`, "a", `t${index}`)),
			);

			const onBottom = result.edges.filter(
				({ source }) => source.side === "bottom",
			);
			// The one turning off first, toward the boxes, takes the side nearer them.
			expect(onBottom.map(({ id, source }) => [id, source.t])).toEqual([
				["e2", 40 / 60],
				["e3", 20 / 60],
			]);
			for (const routed of onBottom) {
				expect(routed.points[0].x).toBe(
					calcAnchorPoint(nodes[0].bounds, routed.source).x,
				);
			}
		});

		it("keeps the ends sharing a side within the stretch a layered layout fans them over", () => {
			// Seven boxes in a column to the right: three edges leave a's bottom, whose
			// fan stretch 4..36 shares 32px as two gaps of 16.
			const ys = [-300, -200, -100, 0, 100, 200, 300];
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
});
