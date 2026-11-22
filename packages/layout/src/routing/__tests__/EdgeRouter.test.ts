import { convertRectToBoundingBox, doRectsOverlap } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { EDGE_ROUTE_MARGIN } from "../edgeRoutingCosts";
import { listContendedSideKeys, listEndCandidates } from "../endCandidates";
import {
	EdgeRouter,
	type Obstacle,
	type PreparedEdge,
} from "../search/EdgeRouter";
import { createRouteLines, toGridLines } from "../search/RouteGrid";
import { collectOrigins } from "../search/routeOrigins";
import type { RoutableEdge, RoutableNode, RoutedEdge } from "../types";

const box = (id: string, x: number, y: number, width = 60, height = 40) => ({
	id,
	bounds: { x, y, width, height },
});

const edge = (
	id: string,
	sourceId: string,
	targetId: string,
): RoutableEdge => ({
	id,
	sourceId,
	targetId,
});

/**
 * The edges prepared as routeEdgesAroundNodes prepares them, keyed by id, and a maker
 * of routers on lines of their own: a router counts its routes onto its lines, so two
 * routers cannot share them. No caption or border.
 */
const prepareScene = (
	nodes: readonly RoutableNode[],
	edges: readonly RoutableEdge[],
): {
	prepared: Map<string, PreparedEdge>;
	createRouter: () => EdgeRouter;
} => {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const obstacles: Obstacle[] = nodes.map((node, index) => ({
		index,
		rect: node.bounds,
		box: convertRectToBoundingBox(node.bounds),
		ownerId: node.id,
		isLabel: false,
	}));
	const ends = edges.map((routable) => ({
		routable,
		source: nodeById.get(routable.sourceId) as RoutableNode,
		target: nodeById.get(routable.targetId) as RoutableNode,
	}));
	const contendedSideKeys = listContendedSideKeys(ends);
	const prepared = new Map<string, PreparedEdge>();
	for (const { routable, source, target } of ends) {
		const excluded = obstacles.filter(
			({ ownerId, rect }) =>
				ownerId !== source.id &&
				ownerId !== target.id &&
				(doRectsOverlap(rect, source.bounds) ||
					doRectsOverlap(rect, target.bounds)),
		);
		const excludedSet = new Set(excluded);
		prepared.set(routable.id, {
			edge: routable,
			sourceNode: source,
			targetNode: target,
			sourceBox: convertRectToBoundingBox(source.bounds),
			targetBox: convertRectToBoundingBox(target.bounds),
			excluded,
			sources: listEndCandidates(
				source,
				target,
				obstacles,
				excludedSet,
				[],
				contendedSideKeys,
			),
			targets: listEndCandidates(
				target,
				source,
				obstacles,
				excludedSet,
				[],
				contendedSideKeys,
			),
		});
	}
	const { origins, xs, ys } = collectOrigins(
		obstacles,
		[],
		[...prepared.values()],
	);
	return {
		prepared,
		createRouter: () =>
			new EdgeRouter(
				createRouteLines(
					toGridLines(xs),
					toGridLines(ys),
					[],
					EDGE_ROUTE_MARGIN,
				),
				obstacles,
				origins,
			),
	};
};

describe("EdgeRouter", () => {
	describe("reroute", () => {
		// m stands between a and b, u straight above it: "around" goes round m above or
		// below, "down" runs straight from u into m, and "detour" comes from p, left of a,
		// over a into m's top.
		const nodes = [
			box("a", 0, 0),
			box("b", 300, 0),
			// Far enough above m that m's top stub, which "detour" ends on, stays one
			// margin long and so on the line "around" first ran along.
			box("u", 150, -180),
			box("m", 150, 0),
			box("p", -150, 0),
		];
		const { prepared, createRouter } = prepareScene(nodes, [
			edge("around", "a", "b"),
			edge("down", "u", "m"),
			edge("detour", "p", "m"),
		]);
		const around = prepared.get("around") as PreparedEdge;
		const down = prepared.get("down") as PreparedEdge;
		const detour = prepared.get("detour") as PreparedEdge;

		it("finds against the routes after it what routing it after them finds", () => {
			const rerouting = createRouter();
			const before = rerouting.route(around);
			const downAfter = rerouting.route(down);
			const rerouted = rerouting.reroute(around);
			const ordered = createRouter();
			const downFirst = ordered.route(down);
			const aroundAfter = ordered.route(around);

			expect(downAfter).toEqual(downFirst);
			expect(rerouted).toEqual(aroundAfter);
			// Routed first, it went over m, where "down" then crossed it.
			expect(rerouted).not.toEqual(before);
		});

		it("routes an edge that has no route yet as route does", () => {
			expect(createRouter().reroute(around)).toEqual(
				createRouter().route(around),
			);
		});

		it("leaves nothing of the route taken back on the lines", () => {
			const rerouting = createRouter();
			const before = rerouting.route(around) as RoutedEdge;
			rerouting.route(down);
			rerouting.reroute(around);
			const ordered = createRouter();
			ordered.route(down);
			ordered.route(around);

			const detourAfter = ordered.route(detour) as RoutedEdge;
			expect(rerouting.route(detour)).toEqual(detourAfter);
			// It runs where "around" first ran, over a.
			expect(detourAfter.points.map(({ y }) => y)).toContain(
				before.points[0].y,
			);
		});
	});

	describe("isOvertaken", () => {
		// As above: "around" routed first goes over m, where "down" then crosses it.
		const nodes = [
			box("a", 0, 0),
			box("b", 300, 0),
			box("u", 150, -120),
			box("m", 150, 0),
			box("far", 0, 400),
			box("off", 300, 400),
		];
		const { prepared, createRouter } = prepareScene(nodes, [
			edge("around", "a", "b"),
			edge("down", "u", "m"),
			edge("apart", "far", "off"),
		]);
		const around = prepared.get("around") as PreparedEdge;
		const down = prepared.get("down") as PreparedEdge;
		const apart = prepared.get("apart") as PreparedEdge;

		it("holds for an edge a later route crosses, not for the later one nor one apart", () => {
			const router = createRouter();
			router.route(around);
			router.route(apart);

			expect(router.isOvertaken(around.edge)).toBe(false);

			router.route(down);

			expect(router.isOvertaken(around.edge)).toBe(true);
			expect(router.isOvertaken(down.edge)).toBe(false);
			expect(router.isOvertaken(apart.edge)).toBe(false);
		});

		it("holds no longer once the edge is routed again, clear of the other", () => {
			const router = createRouter();
			router.route(around);
			router.route(down);
			router.reroute(around);

			expect(router.isOvertaken(around.edge)).toBe(false);
			expect(router.isOvertaken(down.edge)).toBe(false);
		});

		it("is not raised by a route found again where it was", () => {
			// "across" runs straight from a to b and "through" straight down from u to
			// d, crossing it; any way round u or d costs more than the crossing, so
			// "across" routed again comes out where it was, still crossing "through".
			const crossing = prepareScene(
				[
					box("a", 0, 0),
					box("b", 300, 0),
					box("u", 150, -150),
					box("d", 150, 150),
				],
				[edge("across", "a", "b"), edge("through", "u", "d")],
			);
			const across = crossing.prepared.get("across") as PreparedEdge;
			const through = crossing.prepared.get("through") as PreparedEdge;
			const router = crossing.createRouter();
			const before = router.route(across);
			router.route(through);

			expect(router.isOvertaken(across.edge)).toBe(true);
			expect(router.reroute(across)).toEqual(before);
			expect(router.isOvertaken(across.edge)).toBe(false);
			expect(router.isOvertaken(through.edge)).toBe(false);
		});

		it("is false for an edge with no route", () => {
			expect(createRouter().isOvertaken(around.edge)).toBe(false);
		});
	});
});
