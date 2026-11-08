import type { BoundingBox } from "@jiscribe/geometry";

import { EDGE_ROUTE_MARGIN, ROUTE_COSTS } from "./edgeRoutingCosts";
import {
	type GridSpan,
	type RouteLines,
	growBox,
	snapToGridResolution,
	toGridSpan,
} from "./RouteGrid";

/**
 * The graph a route searches, built for one set of obstacles on shared lines (an
 * orthogonal visibility graph): from every point of interest a line runs each way
 * until an obstacle stops it, a node stands where two such lines cross, and a link
 * joins neighbouring nodes along a line. Nodes are numbered row by row, left to right.
 */
export type RouteGraph = {
	/** Each node's column among the lines' xs. */
	nodeXi: Int32Array;
	/** Each node's row among the lines' ys. */
	nodeYi: Int32Array;
	/** The first node of each row, and past the last row the node count. */
	rowStart: Int32Array;
	/** The nodes column by column, each column's top to bottom; see columnStart. */
	columnNodes: Int32Array;
	/** Where each column's nodes start in `columnNodes`, and past the last column its length. */
	columnStart: Int32Array;
	/** At node × 4 + direction, the next node that way along a line, -1 for none. */
	neighbours: Int32Array;
	/**
	 * At node × 4 + direction, what the link to that neighbour costs whatever has been
	 * drawn: its length, the margin bands it runs in and the borders it crosses.
	 */
	linkCosts: Float64Array;
	/**
	 * At node × 4 + direction, what the link costs for the routes drawn so far: those
	 * it runs along, and those crossing it between its two ends. Kept up to date by
	 * whoever draws (see EdgeRouter).
	 */
	drawnCosts: Float64Array;
	/** How many of the drawn unit steps `drawnCosts` has taken in (see EdgeRouter). */
	appliedDrawnStepCount: number;
};

/** Bit set on a unit step a line running right or down covers. */
const COVERED_FORWARD = 1;
/** Bit set on a unit step a line running left or up covers. */
const COVERED_BACKWARD = 2;
/** Bit set on a unit step that runs through an obstacle or flush along its edge. */
const BLOCKED = 4;

/**
 * How near a point lies to a box, as the margin band's weight: 1 against or inside
 * the box, falling to 0 a margin away, measured on the nearer axis outside it.
 */
const calcBandWeight = (x: number, y: number, box: BoundingBox): number => {
	const distance = Math.max(
		box.left - x,
		x - box.right,
		box.top - y,
		y - box.bottom,
		0,
	);
	return 1 - distance / EDGE_ROUTE_MARGIN;
};

/** The index among `sorted` of the last value at or before `value` (or before it, unless `inclusive`); -1 for none. */
const findLastIndex = (
	sorted: Int32Array,
	from: number,
	to: number,
	value: number,
	inclusive: boolean,
): number => {
	let low = from;
	let high = to;
	while (low < high) {
		const middle = (low + high) >> 1;
		const isBefore = inclusive
			? sorted[middle] <= value
			: sorted[middle] < value;
		if (isBefore) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low - 1 >= from ? low - 1 : -1;
};

/** The node at (xi, yi), or -1 where there is none. */
export const findNode = (graph: RouteGraph, xi: number, yi: number): number => {
	const index = findLastIndex(
		graph.nodeXi,
		graph.rowStart[yi],
		graph.rowStart[yi + 1],
		xi,
		true,
	);
	return index >= 0 && graph.nodeXi[index] === xi ? index : -1;
};

/**
 * The node whose link right along row `yi` (or down column `xi` when not
 * `horizontal`) covers the stretch from `from` to `to` (line indices along the row or
 * column, `from` <= `to`); a link only touching an end of it does not, unless
 * `inclusive`. -1 when no link does.
 *
 * @param line - The row's yi, or the column's xi
 */
export const findLinkCovering = (
	graph: RouteGraph,
	horizontal: boolean,
	line: number,
	from: number,
	to: number,
	inclusive: boolean,
): number => {
	const positions = horizontal ? graph.nodeXi : graph.nodeYi;
	let node: number;
	if (horizontal) {
		node = findLastIndex(
			graph.nodeXi,
			graph.rowStart[line],
			graph.rowStart[line + 1],
			from,
			inclusive,
		);
	} else {
		const yis = graph.nodeYi;
		const start = graph.columnStart[line];
		const end = graph.columnStart[line + 1];
		let low = start;
		let high = end;
		while (low < high) {
			const middle = (low + high) >> 1;
			const position = yis[graph.columnNodes[middle]];
			if (inclusive ? position <= from : position < from) {
				low = middle + 1;
			} else {
				high = middle;
			}
		}
		node = low - 1 >= start ? graph.columnNodes[low - 1] : -1;
	}
	if (node < 0) {
		return -1;
	}
	const next = graph.neighbours[node * 4 + (horizontal ? 1 : 2)];
	if (next < 0) {
		return -1;
	}
	const reach = positions[next];
	const isCovering = inclusive ? reach >= to : reach > to;
	return isCovering ? node : -1;
};

/**
 * Build the graph for routes that keep out of `obstacles`: a unit step is blocked
 * where it runs through a box's inside, or along one of its edges overlapping it,
 * so a route neither enters a box nor runs flush along it; touching an edge at
 * right angles, as a stub leaving its box does, is open.
 *
 * @param lines - The shared lines, borders counted in
 * @param obstacles - The boxes no route enters, in the lines' coordinates; each also
 *   weighs the band a margin around it
 * @param origins - The points of interest as line indices, x then y for each, every
 *   one a node whatever crosses it
 */
export const buildRouteGraph = (
	lines: RouteLines,
	obstacles: readonly BoundingBox[],
	origins: Int32Array,
): RouteGraph => {
	const { xs, ys } = lines;
	const nx = xs.length;
	const ny = ys.length;
	const stepsH = new Uint8Array(ny * Math.max(nx - 1, 0));
	const stepsV = new Uint8Array(nx * Math.max(ny - 1, 0));
	const boxes = obstacles.map((obstacle) => ({
		left: snapToGridResolution(obstacle.left),
		top: snapToGridResolution(obstacle.top),
		right: snapToGridResolution(obstacle.right),
		bottom: snapToGridResolution(obstacle.bottom),
	}));
	const bands: GridSpan[] = [];
	for (const box of boxes) {
		const span = toGridSpan(lines, box);
		for (let yi = span.top; yi <= span.bottom; yi += 1) {
			for (let xi = span.left; xi < span.right; xi += 1) {
				stepsH[yi * (nx - 1) + xi] = BLOCKED;
			}
		}
		for (let xi = span.left; xi <= span.right; xi += 1) {
			for (let yi = span.top; yi < span.bottom; yi += 1) {
				stepsV[xi * (ny - 1) + yi] = BLOCKED;
			}
		}
		bands.push(toGridSpan(lines, growBox(box, EDGE_ROUTE_MARGIN)));
	}

	// Run a line each way from every point of interest until a blocked step.
	const isOrigin = new Uint8Array(nx * ny);
	for (let index = 0; index < origins.length; index += 2) {
		const originXi = origins[index];
		const originYi = origins[index + 1];
		isOrigin[originYi * nx + originXi] = 1;
		for (let xi = originXi; xi < nx - 1; xi += 1) {
			const step = originYi * (nx - 1) + xi;
			if ((stepsH[step] & (BLOCKED | COVERED_FORWARD)) !== 0) {
				break;
			}
			stepsH[step] |= COVERED_FORWARD;
		}
		for (let xi = originXi; xi > 0; xi -= 1) {
			const step = originYi * (nx - 1) + xi - 1;
			if ((stepsH[step] & (BLOCKED | COVERED_BACKWARD)) !== 0) {
				break;
			}
			stepsH[step] |= COVERED_BACKWARD;
		}
		for (let yi = originYi; yi < ny - 1; yi += 1) {
			const step = originXi * (ny - 1) + yi;
			if ((stepsV[step] & (BLOCKED | COVERED_FORWARD)) !== 0) {
				break;
			}
			stepsV[step] |= COVERED_FORWARD;
		}
		for (let yi = originYi; yi > 0; yi -= 1) {
			const step = originXi * (ny - 1) + yi - 1;
			if ((stepsV[step] & (BLOCKED | COVERED_BACKWARD)) !== 0) {
				break;
			}
			stepsV[step] |= COVERED_BACKWARD;
		}
	}
	const isCovered = (flags: number): boolean =>
		(flags & (COVERED_FORWARD | COVERED_BACKWARD)) !== 0;

	const nodeXis: number[] = [];
	const nodeYis: number[] = [];
	const rowStart = new Int32Array(ny + 1);
	const columnCounts = new Int32Array(nx);
	for (let yi = 0; yi < ny; yi += 1) {
		rowStart[yi] = nodeXis.length;
		for (let xi = 0; xi < nx; xi += 1) {
			const onH =
				(xi > 0 && isCovered(stepsH[yi * (nx - 1) + xi - 1])) ||
				(xi < nx - 1 && isCovered(stepsH[yi * (nx - 1) + xi]));
			const onV =
				(yi > 0 && isCovered(stepsV[xi * (ny - 1) + yi - 1])) ||
				(yi < ny - 1 && isCovered(stepsV[xi * (ny - 1) + yi]));
			if (isOrigin[yi * nx + xi] === 1 || (onH && onV)) {
				nodeXis.push(xi);
				nodeYis.push(yi);
				columnCounts[xi] += 1;
			}
		}
	}
	const nodeCount = nodeXis.length;
	rowStart[ny] = nodeCount;
	const nodeXi = Int32Array.from(nodeXis);
	const nodeYi = Int32Array.from(nodeYis);
	const columnStart = new Int32Array(nx + 1);
	for (let xi = 0; xi < nx; xi += 1) {
		columnStart[xi + 1] = columnStart[xi] + columnCounts[xi];
	}
	// Nodes come row by row, so filling each column in that order keeps it top to bottom.
	const columnNodes = new Int32Array(nodeCount);
	const columnFill = columnStart.slice(0, nx);
	for (let node = 0; node < nodeCount; node += 1) {
		columnNodes[columnFill[nodeXi[node]]] = node;
		columnFill[nodeXi[node]] += 1;
	}

	const neighbours = new Int32Array(nodeCount * 4).fill(-1);
	const linkCosts = new Float64Array(nodeCount * 4);
	const link = (
		fromNode: number,
		toNode: number,
		forward: number,
		cost: number,
	): void => {
		neighbours[fromNode * 4 + forward] = toNode;
		linkCosts[fromNode * 4 + forward] = cost;
		neighbours[toNode * 4 + ((forward + 2) % 4)] = fromNode;
		linkCosts[toNode * 4 + ((forward + 2) % 4)] = cost;
	};

	// The bands crossing each row, in the order they start along it, and likewise each
	// column, so a point's band weight is read off the few covering it.
	const bandsByRow: number[][] = Array.from({ length: ny }, () => []);
	const bandsByColumn: number[][] = Array.from({ length: nx }, () => []);
	const bandIndices = bands.map((_, index) => index);
	for (const index of [...bandIndices].sort(
		(first, second) => bands[first].left - bands[second].left,
	)) {
		const band = bands[index];
		for (let yi = band.top; yi <= band.bottom; yi += 1) {
			bandsByRow[yi].push(index);
		}
	}
	for (const index of bandIndices.sort(
		(first, second) => bands[first].top - bands[second].top,
	)) {
		const band = bands[index];
		for (let xi = band.left; xi <= band.right; xi += 1) {
			bandsByColumn[xi].push(index);
		}
	}
	/**
	 * Weigh the points of one row (or column when not `horizontal`) in order along it:
	 * each call's `xi` and `yi` lie on the line, no earlier along it than the last call's.
	 *
	 * @param crossing - The bands crossing the line, in the order they start along it
	 */
	const sweepBands = (
		crossing: readonly number[],
		horizontal: boolean,
		borderNear: Float64Array | undefined,
	): ((xi: number, yi: number) => number) => {
		let started = 0;
		const covering: number[] = [];
		return (xi, yi) => {
			const along = horizontal ? xi : yi;
			while (started < crossing.length) {
				const band = bands[crossing[started]];
				if ((horizontal ? band.left : band.top) > along) {
					break;
				}
				covering.push(crossing[started]);
				started += 1;
			}
			let weight = borderNear === undefined ? 0 : borderNear[yi * nx + xi];
			// Walks back, so the last band, moved into a dropped one's place, is one
			// already weighed.
			for (let at = covering.length - 1; at >= 0; at -= 1) {
				const index = covering[at];
				const band = bands[index];
				if ((horizontal ? band.right : band.bottom) < along) {
					covering[at] = covering[covering.length - 1];
					covering.pop();
					continue;
				}
				weight = Math.max(weight, calcBandWeight(xs[xi], ys[yi], boxes[index]));
			}
			return weight;
		};
	};

	/**
	 * What a unit step costs whatever has been drawn: its length, the band it runs in
	 * weighed at its two ends (the nearer box, or a border alongside), and half a
	 * border crossing at each end lying on a border's side across it. Put on the lines'
	 * resolution, so the costs add up exactly.
	 */
	const calcStepCost = (
		length: number,
		fromWeight: number,
		toWeight: number,
		fromBorderSides: number,
		toBorderSides: number,
	): number =>
		length +
		snapToGridResolution(
			(length * ROUTE_COSTS.bandPerPx * (fromWeight + toWeight)) / 2,
		) +
		((fromBorderSides + toBorderSides) * ROUTE_COSTS.borderCrossing) / 2;

	const borders = lines.borders;
	for (let yi = 0; yi < ny; yi += 1) {
		const weighPoint = sweepBands(bandsByRow[yi], true, borders?.nearH);
		let lastNode = -1;
		let cost = 0;
		// The weight at the current point, NaN until a covered step needs it.
		let weight = Number.NaN;
		let node = rowStart[yi];
		for (let xi = 0; xi < nx; xi += 1) {
			if (node < rowStart[yi + 1] && nodeXi[node] === xi) {
				if (lastNode >= 0) {
					link(lastNode, node, 1, cost);
				}
				lastNode = node;
				cost = 0;
				node += 1;
			}
			if (xi < nx - 1 && isCovered(stepsH[yi * (nx - 1) + xi])) {
				if (Number.isNaN(weight)) {
					weight = weighPoint(xi, yi);
				}
				const nextWeight = weighPoint(xi + 1, yi);
				cost += calcStepCost(
					xs[xi + 1] - xs[xi],
					weight,
					nextWeight,
					borders?.sidesV[yi * nx + xi] ?? 0,
					borders?.sidesV[yi * nx + xi + 1] ?? 0,
				);
				weight = nextWeight;
			} else {
				lastNode = -1;
				cost = 0;
				weight = Number.NaN;
			}
		}
	}
	for (let xi = 0; xi < nx; xi += 1) {
		const weighPoint = sweepBands(bandsByColumn[xi], false, borders?.nearV);
		let lastNode = -1;
		let cost = 0;
		let weight = Number.NaN;
		let index = columnStart[xi];
		for (let yi = 0; yi < ny; yi += 1) {
			if (index < columnStart[xi + 1] && nodeYi[columnNodes[index]] === yi) {
				const node = columnNodes[index];
				if (lastNode >= 0) {
					link(lastNode, node, 2, cost);
				}
				lastNode = node;
				cost = 0;
				index += 1;
			}
			if (yi < ny - 1 && isCovered(stepsV[xi * (ny - 1) + yi])) {
				if (Number.isNaN(weight)) {
					weight = weighPoint(xi, yi);
				}
				const nextWeight = weighPoint(xi, yi + 1);
				cost += calcStepCost(
					ys[yi + 1] - ys[yi],
					weight,
					nextWeight,
					borders?.sidesH[yi * nx + xi] ?? 0,
					borders?.sidesH[(yi + 1) * nx + xi] ?? 0,
				);
				weight = nextWeight;
			} else {
				lastNode = -1;
				cost = 0;
				weight = Number.NaN;
			}
		}
	}
	return {
		nodeXi,
		nodeYi,
		rowStart,
		columnNodes,
		columnStart,
		neighbours,
		linkCosts,
		drawnCosts: new Float64Array(nodeCount * 4),
		appliedDrawnStepCount: 0,
	};
};
