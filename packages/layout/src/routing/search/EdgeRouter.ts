import {
	type BoundingBox,
	type Point,
	type Rect,
	unionBoundingBoxes,
} from "@jiscribe/geometry";

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
import { isAtLeast, isSameCoordinate } from "../../shared/coordinate";
import { simplifyRoute } from "../../shared/simplifyRoute";
import type { LayoutSide } from "../../shared/types";
import { EDGE_ROUTE_MARGIN, ROUTE_COSTS } from "../edgeRoutingCosts";
import type { RoutableEdge, RoutableNode, RoutedEdge } from "../types";

/** A rect no route enters, with what it belongs to. */
export type Obstacle = {
	/** Its place among every obstacle, which names the set an edge leaves out. */
	index: number;
	rect: Rect;
	box: BoundingBox;
	/** The node whose box or caption it is; undefined for one of `options.obstacles`. */
	ownerId?: string;
	isLabel: boolean;
	/** Set for a hollow node's box, which only the edges ending on that node keep out of. */
	isHollow?: true;
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
	/** Whether the end is held to this spot (see RoutableEdge.sourceEnds). */
	isPinned: boolean;
};

export type PreparedEdge = {
	edge: RoutableEdge;
	/** The node the edge starts at. */
	sourceNode: RoutableNode;
	/** The node the edge ends at. */
	targetNode: RoutableNode;
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
		if (isSameCoordinate(lateral, 0) && isAtLeast(ahead, 0)) {
			return 0;
		}
		return ahead > 0 ? 2 : 4;
	}
	if (arrival === oppositeDirection(direction)) {
		const lateral = deltaX * STEP_Y[direction] - deltaY * STEP_X[direction];
		return isSameCoordinate(lateral, 0) ? 4 : 2;
	}
	const aheadAlongArrival = deltaX * STEP_X[arrival] + deltaY * STEP_Y[arrival];
	return isAtLeast(ahead, 0) && isAtLeast(aheadAlongArrival, 0) ? 1 : 3;
};

/** A unit step and which way it runs, as one number: the step × 2, plus 1 for a vertical one. */
const toDrawnStep = (step: number, direction: RouteDirection): number =>
	isHorizontalDirection(direction) ? step * 2 : step * 2 + 1;

/** What one route drew on the lines, as toDrawnStep numbers. */
type DrawnRoute = {
	/** Every unit step, stubs included, one entry per step run. */
	steps: number[];
	/** The stub steps among them, under each end's key. */
	stubSteps: { endKey: string; steps: number[] }[];
	/** The keys of its pinned ends, whose bundles its steps were added to. */
	pinnedEndKeys: string[];
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
 * must keep out of and against the routes drawn at the time: those before it for
 * `route`, every other one for `reroute`; see routeEdgesAroundNodes.
 */
export class EdgeRouter {
	private readonly lines: RouteLines;
	private readonly obstacles: readonly Obstacle[];
	/** The bands every graph lets a route only cross straight over; see buildRouteGraph. */
	private readonly crossableBands: readonly BoundingBox[];
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
	 * How many of the routes drawn to each pinned end run along each unit step, stubs
	 * included, by the end's key and then the step's toDrawnStep number: what a later
	 * route to the same end may follow as its bundle.
	 */
	private readonly routeStepsByPinnedEnd = new Map<
		string,
		Map<number, number>
	>();
	/**
	 * What each routed edge drew, for reroute to take back; by the edge itself, ids
	 * not having to differ.
	 */
	private readonly drawnRouteByEdge = new Map<RoutableEdge, DrawnRoute>();
	/** The edges whose routes run along each unit step, by toDrawnStep number. */
	private readonly edgesByStep = new Map<number, Set<RoutableEdge>>();
	/** What reroute took back of the edge it is routing again; undefined otherwise. */
	private routeTakenBack: DrawnRoute | undefined;
	/** The edges a route drawn after theirs runs along or crosses; see isOvertaken. */
	private readonly overtakenEdges = new Set<RoutableEdge>();
	/**
	 * Every unit step whose count of routes changed so far, drawn or taken back, in
	 * that order, as step × 2 plus 1 for a vertical one: what a graph's `drawnCosts`
	 * takes in (see applyDrawnSteps).
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
		crossableBands: readonly BoundingBox[],
	) {
		this.lines = lines;
		this.obstacles = obstacles;
		this.crossableBands = crossableBands;
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
				this.crossableBands,
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
	private countDrawnCrossingsAt(
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
	 * What running `steps` unit steps from (xi, yi) in `direction` costs: the routes
	 * drawn crossing it at the points between its two ends, and what `calcStepCost` makes
	 * of each step.
	 *
	 * @param calcStepCost - Given where a step starts and its index among the lines' steps
	 */
	private sumStepCosts(
		xi: number,
		yi: number,
		direction: RouteDirection,
		steps: number,
		calcStepCost: (atXi: number, atYi: number, step: number) => number,
	): number {
		let cost = 0;
		let atXi = xi;
		let atYi = yi;
		for (let index = 0; index < steps; index += 1) {
			if (index > 0) {
				cost +=
					this.countDrawnCrossingsAt(atXi, atYi, direction) *
					ROUTE_COSTS.crossing;
			}
			cost += calcStepCost(
				atXi,
				atYi,
				stepIndex(this.lines, atXi, atYi, direction),
			);
			atXi += STEP_X[direction];
			atYi += STEP_Y[direction];
		}
		return cost;
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
		return this.sumStepCosts(xi, yi, direction, steps, (atXi, atYi, step) => {
			const occupied = this.occupiedOn(step, direction);
			return occupied > 0
				? this.stepLength(atXi, atYi, direction) *
						occupied *
						ROUTE_COSTS.overlapPerPx
				: 0;
		});
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
		return this.sumStepCosts(
			startXi,
			startYi,
			direction,
			steps,
			(xi, yi, step) => {
				const occupied =
					this.occupiedOn(step, direction) -
					(sameEndSteps?.get(toDrawnStep(step, direction)) ?? 0);
				const length = this.stepLength(xi, yi, direction);
				return (
					length +
					length * occupied * ROUTE_COSTS.overlapPerPx +
					(((borderSides?.[pointIndex(this.lines, xi, yi)] ?? 0) +
						(borderSides?.[
							pointIndex(
								this.lines,
								xi + STEP_X[direction],
								yi + STEP_Y[direction],
							)
						] ?? 0)) *
						ROUTE_COSTS.borderCrossing) /
						2
				);
			},
		);
	}

	/**
	 * The route's unit steps, and its stubs under their ends, for countDrawnRoute to
	 * count as drawn and reroute to take back.
	 */
	private occupy(
		route: readonly { xi: number; yi: number }[],
		source: EndCandidate,
		target: EndCandidate,
	): DrawnRoute {
		const drawn: DrawnRoute = { steps: [], stubSteps: [], pinnedEndKeys: [] };
		const mark = (
			xi: number,
			yi: number,
			direction: RouteDirection,
			stubSteps?: number[],
		): void => {
			const key = toDrawnStep(
				stepIndex(this.lines, xi, yi, direction),
				direction,
			);
			drawn.steps.push(key);
			stubSteps?.push(key);
		};
		for (const candidate of [source, target]) {
			const stub = this.toStubOnLines(candidate);
			const stubSteps: number[] = [];
			drawn.stubSteps.push({ endKey: candidate.endKey, steps: stubSteps });
			let { xi, yi } = stub;
			for (let index = 0; index < stub.steps; index += 1) {
				mark(xi, yi, stub.direction, stubSteps);
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
		for (const candidate of [source, target]) {
			if (candidate.isPinned) {
				drawn.pinnedEndKeys.push(candidate.endKey);
			}
		}
		return drawn;
	}

	/**
	 * Count a route's steps into what the lines hold, or back out of it.
	 *
	 * @param delta - 1 to draw the route, -1 to take it back
	 * @param overtakes - Whether to note the routes it runs along or crosses as
	 *   overtaken (see isOvertaken); false for a route drawn back where it was
	 */
	private countDrawnRoute(
		edge: RoutableEdge,
		drawn: DrawnRoute,
		delta: 1 | -1,
		overtakes = delta === 1,
	): void {
		const count = (steps: Map<number, number>, key: number): void => {
			const total = (steps.get(key) ?? 0) + delta;
			if (total === 0) {
				steps.delete(key);
			} else {
				steps.set(key, total);
			}
		};
		const stepsOf = (
			byEnd: Map<string, Map<number, number>>,
			endKey: string,
		): Map<number, number> => {
			let steps = byEnd.get(endKey);
			if (steps === undefined) {
				steps = new Map();
				byEnd.set(endKey, steps);
			}
			return steps;
		};
		for (const key of drawn.steps) {
			if ((key & 1) === 0) {
				this.lines.occupiedH[key >> 1] += delta;
			} else {
				this.lines.occupiedV[key >> 1] += delta;
			}
			// A step whose count changed either way has its links' costs counted again.
			this.drawnSteps.push(key);
			let edges = this.edgesByStep.get(key);
			if (delta === 1) {
				if (edges === undefined) {
					edges = new Set();
					this.edgesByStep.set(key, edges);
				}
				edges.add(edge);
			} else {
				edges?.delete(edge);
			}
		}
		if (overtakes) {
			this.markOvertaken(edge, drawn);
		}
		if (delta === -1) {
			this.overtakenEdges.delete(edge);
		}
		for (const { endKey, steps } of drawn.stubSteps) {
			const stubSteps = stepsOf(this.stubStepsByEnd, endKey);
			for (const key of steps) {
				count(stubSteps, key);
			}
		}
		for (const endKey of drawn.pinnedEndKeys) {
			const bundleSteps = stepsOf(this.routeStepsByPinnedEnd, endKey);
			for (const key of drawn.steps) {
				count(bundleSteps, key);
			}
		}
	}

	/**
	 * Note every other edge whose route the newly drawn one runs along, or crosses at
	 * the point one of its steps runs to, as overtaken.
	 */
	private markOvertaken(edge: RoutableEdge, drawn: DrawnRoute): void {
		const nx = this.lines.xs.length;
		const ny = this.lines.ys.length;
		const mark = (other: RoutableEdge): void => {
			if (other !== edge) {
				this.overtakenEdges.add(other);
			}
		};
		for (const key of drawn.steps) {
			this.edgesByStep.get(key)?.forEach(mark);
			const step = key >> 1;
			const isHorizontal = (key & 1) === 0;
			const xi = isHorizontal
				? (step % (nx - 1)) + 1
				: Math.floor(step / (ny - 1));
			const yi = isHorizontal
				? Math.floor(step / (nx - 1))
				: (step % (ny - 1)) + 1;
			const sideways: [RouteDirection, RouteDirection] = isHorizontal
				? [0, 2]
				: [3, 1];
			const before = stepIndex(this.lines, xi, yi, sideways[0]);
			const after = stepIndex(this.lines, xi, yi, sideways[1]);
			if (before < 0 || after < 0) {
				continue;
			}
			const beyond = this.edgesByStep.get(toDrawnStep(after, sideways[1]));
			if (beyond === undefined) {
				continue;
			}
			for (const other of this.edgesByStep.get(
				toDrawnStep(before, sideways[0]),
			) ?? []) {
				if (beyond.has(other)) {
					mark(other);
				}
			}
		}
	}

	/**
	 * Whether a route drawn after the edge's own runs along it or crosses it: the edge
	 * was routed without knowing of that one, so routing it again may mend the two.
	 * False once it is routed again, and for an edge with no route.
	 *
	 * @param edge - An edge given to `route` or `reroute` before
	 */
	isOvertaken(edge: RoutableEdge): boolean {
		return this.overtakenEdges.has(edge);
	}

	/**
	 * Route an edge again against every other route drawn: its own route is taken back
	 * off the lines first, as if it had not been drawn, and the new one drawn in its
	 * place. The route found may be the one it had.
	 *
	 * @param prepared - An edge given to `route` before; one that got no route then is
	 *   routed as `route` would
	 * @returns The new route; undefined when none is found, the route it had then
	 *   staying drawn
	 */
	reroute(prepared: PreparedEdge): RoutedEdge | undefined {
		const { edge } = prepared;
		const drawn = this.drawnRouteByEdge.get(edge);
		if (drawn !== undefined) {
			this.drawnRouteByEdge.delete(edge);
			this.countDrawnRoute(edge, drawn, -1);
		}
		this.routeTakenBack = drawn;
		try {
			const routed = this.route(prepared);
			if (routed === undefined && drawn !== undefined) {
				this.countDrawnRoute(edge, drawn, 1, false);
				this.drawnRouteByEdge.set(edge, drawn);
			}
			return routed;
		} finally {
			this.routeTakenBack = undefined;
		}
	}

	/** The summed length in px of unit steps given as toDrawnStep numbers. */
	private calcDrawnStepsLength(drawnSteps: Iterable<number>): number {
		const { xs, ys } = this.lines;
		let length = 0;
		for (const drawnStep of drawnSteps) {
			const step = drawnStep >> 1;
			if (drawnStep % 2 === 0) {
				const xi = step % (xs.length - 1);
				length += xs[xi + 1] - xs[xi];
			} else {
				const yi = step % (ys.length - 1);
				length += ys[yi + 1] - ys[yi];
			}
		}
		return length;
	}

	/**
	 * How many routes already drawn to one of the edge's pinned ends run along each
	 * unit step, by toDrawnStep number; undefined when none is drawn yet.
	 */
	private collectBundleSteps({
		sources,
		targets,
	}: PreparedEdge): Map<number, number> | undefined {
		let bundle: Map<number, number> | undefined;
		const seen = new Set<string>();
		for (const { isPinned, endKey } of [...sources, ...targets]) {
			if (!isPinned || seen.has(endKey)) {
				continue;
			}
			seen.add(endKey);
			for (const [step, total] of this.routeStepsByPinnedEnd.get(endKey) ??
				[]) {
				bundle ??= new Map();
				bundle.set(step, (bundle.get(step) ?? 0) + total);
			}
		}
		return bundle;
	}

	/**
	 * The cheapest route for one edge: an A* search over (node, direction) from every
	 * source stub tip to a virtual finish reached from every target stub tip.
	 *
	 * @returns The route, or undefined when no target can be reached
	 */
	route(prepared: PreparedEdge): RoutedEdge | undefined {
		const graph = this.graphFor(prepared.excluded);
		const bundleSteps = this.collectBundleSteps(prepared);
		const around = unionBoundingBoxes([
			prepared.sourceBox,
			prepared.targetBox,
		]) as BoundingBox;
		const { xs, ys } = this.lines;
		for (let reach = SEARCH_WINDOW_REACH; ; reach *= SEARCH_WINDOW_GROWTH) {
			const window = growBox(around, reach);
			const coversAll =
				window.left <= xs[0] &&
				window.top <= ys[0] &&
				window.right >= xs[xs.length - 1] &&
				window.bottom >= ys[ys.length - 1];
			const routed = this.searchWithin(prepared, graph, window, bundleSteps);
			if (routed !== undefined || coversAll) {
				return routed;
			}
		}
	}

	private searchWithin(
		prepared: PreparedEdge,
		graph: RouteGraph,
		window: BoundingBox,
		bundleSteps: ReadonlyMap<number, number> | undefined,
	): RoutedEdge | undefined {
		try {
			return this.search(prepared, graph, window, bundleSteps);
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
	 * @param bundleSteps - The steps of the edge's bundle (see collectBundleSteps): a
	 *   link along them costs ROUTE_COSTS.bundledPerPx a px in place of its length and
	 *   its overlap with them, and crosses for free what they already cross
	 */
	private search(
		{ edge, sources, targets }: PreparedEdge,
		graph: RouteGraph,
		window: BoundingBox,
		bundleSteps: ReadonlyMap<number, number> | undefined,
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
		// The most the bundle can take off what is left to run: its own length, at the
		// rate a bundled px is cheaper by.
		const bundleSaving =
			bundleSteps === undefined
				? 0
				: this.calcDrawnStepsLength(bundleSteps.keys()) *
					(1 - ROUTE_COSTS.bundledPerPx);
		const countBundledOn = (
			xi: number,
			yi: number,
			direction: RouteDirection,
		): number => {
			const step = stepIndex(lines, xi, yi, direction);
			return step < 0
				? 0
				: ((bundleSteps as ReadonlyMap<number, number>).get(
						toDrawnStep(step, direction),
					) ?? 0);
		};
		const bundleDiscounts = new Map<number, number>();
		/** What the link leaving `node` in `direction` saves for running along the bundle. */
		const bundleDiscountOf = (
			node: number,
			direction: RouteDirection,
		): number => {
			if (bundleSteps === undefined) {
				return 0;
			}
			const key = node * 4 + direction;
			const known = bundleDiscounts.get(key);
			if (known !== undefined) {
				return known;
			}
			const next = neighbours[key];
			const steps =
				Math.abs(nodeXi[next] - nodeXi[node]) +
				Math.abs(nodeYi[next] - nodeYi[node]);
			let discount = 0;
			let atXi = nodeXi[node];
			let atYi = nodeYi[node];
			let wasBundled = false;
			for (let index = 0; index < steps; index += 1) {
				const bundled = countBundledOn(atXi, atYi, direction);
				if (bundled > 0) {
					const length = this.stepLength(atXi, atYi, direction);
					discount +=
						length * bundled * ROUTE_COSTS.overlapPerPx +
						length * (1 - ROUTE_COSTS.bundledPerPx);
					if (wasBundled) {
						discount +=
							this.countDrawnCrossingsAt(atXi, atYi, direction) *
							ROUTE_COSTS.crossing;
					}
				}
				wasBundled = bundled > 0;
				atXi += STEP_X[direction];
				atYi += STEP_Y[direction];
			}
			bundleDiscounts.set(key, discount);
			return discount;
		};
		/** Whether the bundle runs straight through (xi, yi) along `direction`. */
		const isBundledThrough = (
			xi: number,
			yi: number,
			direction: RouteDirection,
		): boolean =>
			bundleSteps !== undefined &&
			countBundledOn(xi, yi, direction) > 0 &&
			countBundledOn(xi, yi, oppositeDirection(direction)) > 0;
		const estimate = (
			x: number,
			y: number,
			direction: RouteDirection,
		): number => {
			let best = Infinity;
			for (const tip of reachableTargets) {
				const distance = Math.abs(tip.x - x) + Math.abs(tip.y - y);
				const remaining =
					distance -
					Math.min(distance * (1 - ROUTE_COSTS.bundledPerPx), bundleSaving) +
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
							? this.countDrawnCrossingsAt(xi, yi, arrival) *
								ROUTE_COSTS.crossing
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
				let turnCost: number = ROUTE_COSTS.bend;
				if (direction === arrival) {
					turnCost = isBundledThrough(xi, yi, direction)
						? 0
						: this.countDrawnCrossingsAt(xi, yi, direction) *
							ROUTE_COSTS.crossing;
				}
				const cost =
					g +
					linkCosts[node * 4 + direction] +
					drawnCosts[node * 4 + direction] -
					bundleDiscountOf(node, direction) +
					turnCost;
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
		const drawn = this.occupy(route, source, target);
		const takenBack = this.routeTakenBack;
		// Found again where it was, it overtakes no route it had not before.
		const isWhereItWas =
			takenBack !== undefined &&
			takenBack.steps.length === drawn.steps.length &&
			takenBack.steps.every((key, index) => key === drawn.steps[index]);
		this.countDrawnRoute(edge, drawn, 1, !isWhereItWas);
		this.drawnRouteByEdge.set(edge, drawn);
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
