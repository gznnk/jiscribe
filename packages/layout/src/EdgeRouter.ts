import type { BoundingBox, Point, Rect } from "@jiscribe/geometry";

import { EDGE_ROUTE_MARGIN, ROUTE_COSTS } from "./edgeRoutingCosts";
import { isSameCoordinate } from "./isSameCoordinate";
import {
	type RouteGraph,
	buildRouteGraph,
	findLinkCovering,
	findNode,
} from "./RouteGraph";
import {
	type RouteDirection,
	type RouteLines,
	STEP_X,
	growBox,
	STEP_Y,
	indexOfGridLine,
	isHorizontalDirection,
	oppositeDirection,
	pointIndex,
	snapToGridResolution,
	stepIndex,
} from "./RouteGrid";
import { RouteSearchQueue } from "./RouteSearchQueue";
import type { LayoutSide, RoutableEdge, RoutedEdge } from "./types";

/** A rect no route enters, with what it belongs to. */
export type Obstacle = {
	/** Its place among every obstacle, which names the set an edge leaves out. */
	index: number;
	rect: Rect;
	box: BoundingBox;
	/** The node whose box or caption it is; undefined for one of `options.obstacles`. */
	ownerId?: string;
	isLabel: boolean;
};

/** One place an edge may end at, with the stub it runs out along. */
export type EndCandidate = {
	side: LayoutSide;
	t: number;
	anchor: Point;
	/** Where the stub ends and the route may bend. */
	tip: Point;
	/** The direction the stub runs away from the box. */
	outward: RouteDirection;
	/** What the end costs for its side, on top of running its stub (see EdgeRouter.calcStubCost). */
	sideCost: number;
	/** Names the end, so ends sitting at one spot share their stub for free. */
	endKey: string;
};

export type PreparedEdge = {
	edge: RoutableEdge;
	/** The source node's box. */
	sourceBox: BoundingBox;
	/** The target node's box. */
	targetBox: BoundingBox;
	/** Obstacles this edge may run through: they cover or overlap one of its ends. */
	excluded: Obstacle[];
	sources: EndCandidate[];
	targets: EndCandidate[];
};

/**
 * How far past the two end boxes the first search for an edge reaches, in px: four
 * margins. Finding no route there, it searches again reaching
 * {@link SEARCH_WINDOW_GROWTH} times as far, and so on until it covers every line.
 * The cheapest route inside a window is taken even when a cheaper one runs outside.
 */
const SEARCH_WINDOW_REACH = EDGE_ROUTE_MARGIN * 4;

const SEARCH_WINDOW_GROWTH = 2;

/**
 * How many states (node × 4 + direction) the route graphs the router keeps may hold in
 * all, at some 23 bytes each: about 160 MB. A graph that would take the total past it
 * drops the graphs used longest ago until it fits; the graph in use is kept even when
 * it alone is past it.
 */
const MAX_KEPT_GRAPH_STATES = 7_000_000;

/** Where a finish entry stands among the directions in the search's tie-break: after them all. */
const FINISH_DIRECTION = 4;

const isAtLeastZero = (value: number): boolean =>
	value >= 0 || isSameCoordinate(value, 0);

/**
 * The fewest bends a route can make from heading `direction` at (fromX, fromY) to
 * arriving at (toX, toY) heading `arrival`, obstacles aside: what the search's
 * estimate counts, never more than a real route makes.
 */
const countBendsAtLeast = (
	fromX: number,
	fromY: number,
	direction: RouteDirection,
	toX: number,
	toY: number,
	arrival: RouteDirection,
): number => {
	const deltaX = toX - fromX;
	const deltaY = toY - fromY;
	const ahead = deltaX * STEP_X[direction] + deltaY * STEP_Y[direction];
	if (arrival === direction) {
		const lateral = deltaX * STEP_Y[direction] - deltaY * STEP_X[direction];
		if (isSameCoordinate(lateral, 0) && isAtLeastZero(ahead)) {
			return 0;
		}
		return ahead > 0 ? 2 : 4;
	}
	if (arrival === oppositeDirection(direction)) {
		const lateral = deltaX * STEP_Y[direction] - deltaY * STEP_X[direction];
		return isSameCoordinate(lateral, 0) ? 4 : 2;
	}
	const aheadAlongArrival = deltaX * STEP_X[arrival] + deltaY * STEP_Y[arrival];
	return isAtLeastZero(ahead) && isAtLeastZero(aheadAlongArrival) ? 1 : 3;
};

/** Drop each point equal to the one before it, then each on the straight line between its neighbours. */
const simplifyRoute = (path: readonly Point[]): Point[] => {
	const distinct = path.filter(
		(point, index) =>
			index === 0 ||
			!(
				isSameCoordinate(point.x, path[index - 1].x) &&
				isSameCoordinate(point.y, path[index - 1].y)
			),
	);
	return distinct.filter((point, index) => {
		if (index === 0 || index === distinct.length - 1) {
			return true;
		}
		const previous = distinct[index - 1];
		const next = distinct[index + 1];
		return !(
			(isSameCoordinate(previous.x, point.x) &&
				isSameCoordinate(point.x, next.x)) ||
			(isSameCoordinate(previous.y, point.y) &&
				isSameCoordinate(point.y, next.y))
		);
	});
};

/** A stub on the lines: its anchor's line indices and the unit steps it runs. */
type StubOnLines = {
	xi: number;
	yi: number;
	direction: RouteDirection;
	steps: number;
};

/**
 * Route every edge in turn on shared lines, each on the graph of the obstacles it
 * must keep out of and against the routes drawn before it; see routeEdgesAroundNodes.
 */
export class EdgeRouter {
	private readonly lines: RouteLines;
	private readonly obstacles: readonly Obstacle[];
	/** The points of interest every graph runs its lines from; see buildRouteGraph. */
	private readonly origins: Int32Array;
	/**
	 * One graph per set of obstacles edges leave out, keyed by their indices, the one
	 * used longest ago first; see MAX_KEPT_GRAPH_STATES.
	 */
	private readonly graphs = new Map<string, RouteGraph>();
	/** How many states the graphs in `graphs` hold in all. */
	private keptStateCount = 0;
	/** How many stubs of each end run along each unit step, by end and then step. */
	private readonly stubStepsByEnd = new Map<string, Map<number, number>>();
	/**
	 * Every unit step drawn so far, in the order drawn, as step × 2 plus 1 for a
	 * vertical one: what a graph's `drawnCosts` takes in (see applyDrawnSteps).
	 */
	private readonly drawnSteps: number[] = [];
	/**
	 * The search's cost so far per state (node × 4 + direction) of the graph being
	 * searched; Infinity where unreached. Sized for the largest graph so far.
	 */
	private bestCost = new Float64Array(0);
	/** The state each reached state was reached from; -1 for a start. */
	private cameFrom = new Int32Array(0);
	/** The states one search reached, to set back to Infinity before the next. */
	private readonly reached: number[] = [];
	private readonly queue = new RouteSearchQueue();

	/**
	 * @param origins - The points of interest, each lying on the lines: every end
	 *   candidate's anchor and tip among them
	 */
	constructor(
		lines: RouteLines,
		obstacles: readonly Obstacle[],
		origins: readonly Point[],
	) {
		this.lines = lines;
		this.obstacles = obstacles;
		this.origins = Int32Array.from(
			origins.flatMap(({ x, y }) => [
				indexOfGridLine(lines.xs, x),
				indexOfGridLine(lines.ys, y),
			]),
		);
	}

	private graphFor(excluded: readonly Obstacle[]): RouteGraph {
		const key = excluded.map(({ index }) => index).join(",");
		let graph = this.graphs.get(key);
		if (graph === undefined) {
			const excludedSet = new Set(excluded);
			graph = buildRouteGraph(
				this.lines,
				this.obstacles
					.filter((obstacle) => !excludedSet.has(obstacle))
					.map(({ box }) => box),
				this.origins,
			);
			const stateCount = graph.nodeXi.length * 4;
			for (const [keptKey, keptGraph] of this.graphs) {
				if (this.keptStateCount + stateCount <= MAX_KEPT_GRAPH_STATES) {
					break;
				}
				this.graphs.delete(keptKey);
				this.keptStateCount -= keptGraph.nodeXi.length * 4;
			}
			this.keptStateCount += stateCount;
			if (stateCount > this.bestCost.length) {
				this.bestCost = new Float64Array(stateCount).fill(Infinity);
				this.cameFrom = new Int32Array(stateCount);
			}
		} else {
			this.graphs.delete(key);
		}
		this.graphs.set(key, graph);
		this.applyDrawnSteps(graph);
		return graph;
	}

	/**
	 * Bring the graph's `drawnCosts` up to the steps drawn since it last looked: a link
	 * running along a newly drawn step, or across one of its ends between its own two
	 * ends, has its cost for the drawn routes counted again.
	 */
	private applyDrawnSteps(graph: RouteGraph): void {
		const nx = this.lines.xs.length;
		const ny = this.lines.ys.length;
		// Each link once, by the node it leaves right or down from and that direction.
		const staleLinks = new Set<number>();
		const addLink = (node: number, direction: RouteDirection): void => {
			if (node >= 0) {
				staleLinks.add(node * 4 + direction);
			}
		};
		for (
			let index = graph.appliedDrawnStepCount;
			index < this.drawnSteps.length;
			index += 1
		) {
			const drawnStep = this.drawnSteps[index];
			const step = drawnStep >> 1;
			if ((drawnStep & 1) === 0) {
				const yi = Math.floor(step / (nx - 1));
				const xi = step % (nx - 1);
				addLink(findLinkCovering(graph, true, yi, xi, xi + 1, true), 1);
				for (const atXi of [xi, xi + 1]) {
					addLink(findLinkCovering(graph, false, atXi, yi, yi, false), 2);
				}
			} else {
				const xi = Math.floor(step / (ny - 1));
				const yi = step % (ny - 1);
				addLink(findLinkCovering(graph, false, xi, yi, yi + 1, true), 2);
				for (const atYi of [yi, yi + 1]) {
					addLink(findLinkCovering(graph, true, atYi, xi, xi, false), 1);
				}
			}
		}
		graph.appliedDrawnStepCount = this.drawnSteps.length;
		for (const state of staleLinks) {
			const node = state >> 2;
			const direction = (state & 3) as RouteDirection;
			const next = graph.neighbours[state];
			const xi = graph.nodeXi[node];
			const yi = graph.nodeYi[node];
			const cost = this.calcDrawnRoutesCost(
				xi,
				yi,
				direction,
				Math.abs(graph.nodeXi[next] - xi) + Math.abs(graph.nodeYi[next] - yi),
			);
			graph.drawnCosts[state] = cost;
			graph.drawnCosts[next * 4 + oppositeDirection(direction)] = cost;
		}
	}

	private indexOf(point: Point): { xi: number; yi: number } {
		return {
			xi: indexOfGridLine(this.lines.xs, point.x),
			yi: indexOfGridLine(this.lines.ys, point.y),
		};
	}

	private occupiedOn(step: number, direction: RouteDirection): number {
		return isHorizontalDirection(direction)
			? this.lines.occupiedH[step]
			: this.lines.occupiedV[step];
	}

	private stepLength(
		xi: number,
		yi: number,
		direction: RouteDirection,
	): number {
		const { xs, ys } = this.lines;
		return (
			Math.abs(xs[xi + STEP_X[direction]] - xs[xi]) +
			Math.abs(ys[yi + STEP_Y[direction]] - ys[yi])
		);
	}

	/** Routes already drawn crossing a line running straight through (xi, yi) in `direction`. */
	private countCrossings(
		xi: number,
		yi: number,
		direction: RouteDirection,
	): number {
		const sideways = ((direction + 1) % 4) as RouteDirection;
		const before = stepIndex(this.lines, xi, yi, sideways);
		const after = stepIndex(this.lines, xi, yi, oppositeDirection(sideways));
		if (before < 0 || after < 0) {
			return 0;
		}
		return Math.min(
			this.occupiedOn(before, sideways),
			this.occupiedOn(after, sideways),
		);
	}

	/**
	 * What running `steps` unit steps from (xi, yi) in `direction` costs on top of the
	 * link's own cost: the routes drawn before it that it runs along, and those it
	 * crosses at the points between its two ends.
	 */
	private calcDrawnRoutesCost(
		xi: number,
		yi: number,
		direction: RouteDirection,
		steps: number,
	): number {
		let cost = 0;
		let atXi = xi;
		let atYi = yi;
		for (let index = 0; index < steps; index += 1) {
			if (index > 0) {
				cost +=
					this.countCrossings(atXi, atYi, direction) * ROUTE_COSTS.crossing;
			}
			const occupied = this.occupiedOn(
				stepIndex(this.lines, atXi, atYi, direction),
				direction,
			);
			if (occupied > 0) {
				cost +=
					this.stepLength(atXi, atYi, direction) *
					occupied *
					ROUTE_COSTS.overlapPerPx;
			}
			atXi += STEP_X[direction];
			atYi += STEP_Y[direction];
		}
		return cost;
	}

	private toStubOnLines(candidate: EndCandidate): StubOnLines {
		const anchor = this.indexOf(candidate.anchor);
		const tip = this.indexOf(candidate.tip);
		return {
			...anchor,
			direction: candidate.outward,
			steps: Math.abs(tip.xi - anchor.xi) + Math.abs(tip.yi - anchor.yi),
		};
	}

	/**
	 * What running the stub costs: its length, the routes it runs along (but a stub of
	 * the same end), the routes crossing it between its anchor and its tip, and the
	 * borders it crosses. Measured on the lines, so it adds up exactly with the links.
	 */
	private calcStubCost(candidate: EndCandidate): number {
		const {
			xi: startXi,
			yi: startYi,
			direction,
			steps,
		} = this.toStubOnLines(candidate);
		const borderSides = isHorizontalDirection(direction)
			? this.lines.borders?.sidesV
			: this.lines.borders?.sidesH;
		const sameEndSteps = this.stubStepsByEnd.get(candidate.endKey);
		let cost = 0;
		let xi = startXi;
		let yi = startYi;
		for (let index = 0; index < steps; index += 1) {
			if (index > 0) {
				cost += this.countCrossings(xi, yi, direction) * ROUTE_COSTS.crossing;
			}
			const step = stepIndex(this.lines, xi, yi, direction);
			const key = isHorizontalDirection(direction) ? step * 2 : step * 2 + 1;
			const occupied =
				this.occupiedOn(step, direction) - (sameEndSteps?.get(key) ?? 0);
			const length = this.stepLength(xi, yi, direction);
			const nextXi = xi + STEP_X[direction];
			const nextYi = yi + STEP_Y[direction];
			cost +=
				length +
				length * occupied * ROUTE_COSTS.overlapPerPx +
				(((borderSides?.[pointIndex(this.lines, xi, yi)] ?? 0) +
					(borderSides?.[pointIndex(this.lines, nextXi, nextYi)] ?? 0)) *
					ROUTE_COSTS.borderCrossing) /
					2;
			xi = nextXi;
			yi = nextYi;
		}
		return cost;
	}

	/** Count the route's unit steps, and its stubs under their ends, as drawn. */
	private occupy(
		route: readonly { xi: number; yi: number }[],
		source: EndCandidate,
		target: EndCandidate,
	): void {
		const mark = (
			xi: number,
			yi: number,
			direction: RouteDirection,
			endKey?: string,
		): void => {
			const step = stepIndex(this.lines, xi, yi, direction);
			if (isHorizontalDirection(direction)) {
				this.lines.occupiedH[step] += 1;
				this.drawnSteps.push(step * 2);
			} else {
				this.lines.occupiedV[step] += 1;
				this.drawnSteps.push(step * 2 + 1);
			}
			if (endKey === undefined) {
				return;
			}
			const key = isHorizontalDirection(direction) ? step * 2 : step * 2 + 1;
			let steps = this.stubStepsByEnd.get(endKey);
			if (steps === undefined) {
				steps = new Map();
				this.stubStepsByEnd.set(endKey, steps);
			}
			steps.set(key, (steps.get(key) ?? 0) + 1);
		};
		for (const candidate of [source, target]) {
			const stub = this.toStubOnLines(candidate);
			let { xi, yi } = stub;
			for (let index = 0; index < stub.steps; index += 1) {
				mark(xi, yi, stub.direction, candidate.endKey);
				xi += STEP_X[stub.direction];
				yi += STEP_Y[stub.direction];
			}
		}
		for (let index = 1; index < route.length; index += 1) {
			const from = route[index - 1];
			const to = route[index];
			let direction: RouteDirection;
			if (to.xi !== from.xi) {
				direction = to.xi > from.xi ? 1 : 3;
			} else {
				direction = to.yi > from.yi ? 2 : 0;
			}
			let { xi, yi } = from;
			while (xi !== to.xi || yi !== to.yi) {
				mark(xi, yi, direction);
				xi += STEP_X[direction];
				yi += STEP_Y[direction];
			}
		}
	}

	/**
	 * The cheapest route for one edge: an A* search over (node, direction) from every
	 * source stub tip to a virtual finish reached from every target stub tip.
	 *
	 * @returns The route, or undefined when no target can be reached
	 */
	route(prepared: PreparedEdge): RoutedEdge | undefined {
		const graph = this.graphFor(prepared.excluded);
		const ends = [prepared.sourceBox, prepared.targetBox];
		const around = {
			left: Math.min(...ends.map(({ left }) => left)),
			top: Math.min(...ends.map(({ top }) => top)),
			right: Math.max(...ends.map(({ right }) => right)),
			bottom: Math.max(...ends.map(({ bottom }) => bottom)),
		};
		const { xs, ys } = this.lines;
		for (let reach = SEARCH_WINDOW_REACH; ; reach *= SEARCH_WINDOW_GROWTH) {
			const window = growBox(around, reach);
			const coversAll =
				window.left <= xs[0] &&
				window.top <= ys[0] &&
				window.right >= xs[xs.length - 1] &&
				window.bottom >= ys[ys.length - 1];
			const routed = this.searchWithin(prepared, graph, window);
			if (routed !== undefined || coversAll) {
				return routed;
			}
		}
	}

	private searchWithin(
		prepared: PreparedEdge,
		graph: RouteGraph,
		window: BoundingBox,
	): RoutedEdge | undefined {
		try {
			return this.search(prepared, graph, window);
		} finally {
			for (const state of this.reached) {
				this.bestCost[state] = Infinity;
			}
			this.reached.length = 0;
			this.queue.clear();
		}
	}

	/**
	 * @param window - The search reaches no node outside it, edges included
	 */
	private search(
		{ edge, sources, targets }: PreparedEdge,
		graph: RouteGraph,
		window: BoundingBox,
	): RoutedEdge | undefined {
		const { lines, reached, queue, bestCost, cameFrom } = this;
		const { xs, ys } = lines;
		const ny = ys.length;
		const { nodeXi, nodeYi, neighbours, linkCosts, drawnCosts } = graph;
		const nodeAt = (point: Point): number => {
			const { xi, yi } = this.indexOf(point);
			return findNode(graph, xi, yi);
		};
		const targetNodes = targets.map(({ tip }) => nodeAt(tip));
		const targetNodeSet = new Set(targetNodes);
		const targetCosts = targets.map(
			(candidate) => candidate.sideCost + this.calcStubCost(candidate),
		);
		const finishCosts = targets.map(() => Infinity);
		const finishFrom = targets.map(() => -1);
		// The tips as the lines place them, so the estimate adds up exactly with the costs.
		const reachableTargets = targets.flatMap((candidate, index) =>
			targetNodes[index] < 0
				? []
				: [
						{
							x: xs[nodeXi[targetNodes[index]]],
							y: ys[nodeYi[targetNodes[index]]],
							arrival: oppositeDirection(candidate.outward),
						},
					],
		);
		if (reachableTargets.length === 0) {
			return undefined;
		}
		const estimate = (
			x: number,
			y: number,
			direction: RouteDirection,
		): number => {
			let best = Infinity;
			for (const tip of reachableTargets) {
				const remaining =
					Math.abs(tip.x - x) +
					Math.abs(tip.y - y) +
					countBendsAtLeast(x, y, direction, tip.x, tip.y, tip.arrival) *
						ROUTE_COSTS.bend;
				if (remaining < best) {
					best = remaining;
				}
			}
			return best;
		};
		// Orders entries by x, then y, then direction, a finish after every direction.
		const toTieKey = (xi: number, yi: number, direction: number): number =>
			(xi * ny + yi) * 5 + direction;
		const reach = (state: number, cost: number, from: number): void => {
			if (bestCost[state] === Infinity) {
				reached.push(state);
			}
			bestCost[state] = cost;
			cameFrom[state] = from;
			const node = state >> 2;
			const direction = (state & 3) as RouteDirection;
			const xi = nodeXi[node];
			const yi = nodeYi[node];
			queue.push(
				cost + estimate(xs[xi], ys[yi], direction),
				cost,
				toTieKey(xi, yi, direction),
				state,
			);
		};
		const sourceOfStart = new Map<number, number>();
		sources.forEach((candidate, index) => {
			const node = nodeAt(candidate.tip);
			if (node < 0) {
				return;
			}
			const state = (node << 2) | candidate.outward;
			const cost = candidate.sideCost + this.calcStubCost(candidate);
			if (cost < bestCost[state]) {
				sourceOfStart.set(state, index);
				reach(state, cost, -1);
			}
		});

		while (queue.pop()) {
			const state = queue.poppedState;
			const g = queue.poppedG;
			if (state < 0) {
				const targetIndex = -1 - state;
				if (g > finishCosts[targetIndex]) {
					continue;
				}
				return this.buildRoute(
					edge,
					graph,
					finishFrom[targetIndex],
					sourceOfStart,
					sources,
					targets[targetIndex],
				);
			}
			if (g > bestCost[state]) {
				continue;
			}
			const node = state >> 2;
			const arrival = (state & 3) as RouteDirection;
			const xi = nodeXi[node];
			const yi = nodeYi[node];
			if (targetNodeSet.has(node)) {
				targetNodes.forEach((targetNode, targetIndex) => {
					const candidate = targets[targetIndex];
					if (targetNode !== node || arrival === candidate.outward) {
						return;
					}
					const cost =
						g +
						targetCosts[targetIndex] +
						(arrival === oppositeDirection(candidate.outward)
							? this.countCrossings(xi, yi, arrival) * ROUTE_COSTS.crossing
							: ROUTE_COSTS.bend);
					if (cost < finishCosts[targetIndex]) {
						finishCosts[targetIndex] = cost;
						finishFrom[targetIndex] = state;
						queue.push(
							cost,
							cost,
							toTieKey(xi, yi, FINISH_DIRECTION),
							-1 - targetIndex,
						);
					}
				});
			}
			for (let turn = 0; turn < 4; turn += 1) {
				const direction = turn as RouteDirection;
				const next = neighbours[node * 4 + direction];
				if (next < 0 || direction === oppositeDirection(arrival)) {
					continue;
				}
				const nextX = xs[nodeXi[next]];
				const nextY = ys[nodeYi[next]];
				if (
					nextX < window.left ||
					nextX > window.right ||
					nextY < window.top ||
					nextY > window.bottom
				) {
					continue;
				}
				const cost =
					g +
					linkCosts[node * 4 + direction] +
					drawnCosts[node * 4 + direction] +
					(direction === arrival
						? this.countCrossings(xi, yi, direction) * ROUTE_COSTS.crossing
						: ROUTE_COSTS.bend);
				const nextState = (next << 2) | direction;
				if (cost < bestCost[nextState]) {
					reach(nextState, cost, state);
				}
			}
		}
		return undefined;
	}

	private buildRoute(
		edge: RoutableEdge,
		graph: RouteGraph,
		lastState: number,
		sourceOfStart: ReadonlyMap<number, number>,
		sources: readonly EndCandidate[],
		target: EndCandidate,
	): RoutedEdge {
		const { xs, ys, xValues, yValues } = this.lines;
		const states: number[] = [];
		for (let state = lastState; state >= 0; state = this.cameFrom[state]) {
			states.push(state);
		}
		states.reverse();
		const source = sources[sourceOfStart.get(states[0]) as number];
		const route = states.map((state) => ({
			xi: graph.nodeXi[state >> 2],
			yi: graph.nodeYi[state >> 2],
		}));
		this.occupy(route, source, target);
		const onLines = (point: Point): Point => ({
			x: snapToGridResolution(point.x),
			y: snapToGridResolution(point.y),
		});
		const path = simplifyRoute([
			onLines(source.anchor),
			...route.map(({ xi, yi }) => ({ x: xs[xi], y: ys[yi] })),
			onLines(target.anchor),
		]);
		// The lines put every coordinate on their resolution; a corner takes back the
		// value its line was made from, and the corners next to each end the end's own
		// coordinate on the axis they share with it.
		const corners = path.slice(1, -1).map(({ x, y }) => ({
			x: xValues[indexOfGridLine(xs, x)],
			y: yValues[indexOfGridLine(ys, y)],
		}));
		if (corners.length > 0) {
			const first = corners[0];
			const last = corners[corners.length - 1];
			if (isHorizontalDirection(source.outward)) {
				first.y = source.anchor.y;
			} else {
				first.x = source.anchor.x;
			}
			if (isHorizontalDirection(target.outward)) {
				last.y = target.anchor.y;
			} else {
				last.x = target.anchor.x;
			}
		}
		return {
			id: edge.id,
			source: { side: source.side, t: source.t },
			target: { side: target.side, t: target.t },
			points: corners,
		};
	}
}
