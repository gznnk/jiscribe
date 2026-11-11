import type { BoundingBox } from "@jiscribe/geometry";

/**
 * A move along the lines: 0 up, 1 right, 2 down, 3 left, so the opposite of
 * `direction` is `(direction + 2) % 4` and an odd one is horizontal.
 */
export type RouteDirection = 0 | 1 | 2 | 3;

/** How far one move in each direction goes along x, as a line index. */
export const STEP_X = [0, 1, 0, -1] as const;
/** How far one move in each direction goes along y, as a line index. */
export const STEP_Y = [-1, 0, 1, 0] as const;

export const oppositeDirection = (direction: RouteDirection): RouteDirection =>
	((direction + 2) % 4) as RouteDirection;

export const isHorizontalDirection = (direction: RouteDirection): boolean =>
	direction % 2 === 1;

/**
 * How finely the lines are placed, in lines per px: every coordinate is put on a
 * multiple of its inverse, a power of two, so the lengths a route adds up are exact
 * and two routes of equal cost tie exactly, which the search's tie-break needs (a
 * float's noise would otherwise order a plateau of equal routes at random).
 */
const GRID_RESOLUTION = 1024;

/** `value` on the lines' resolution (see GRID_RESOLUTION). */
export const snapToGridResolution = (value: number): number =>
	Math.round(value * GRID_RESOLUTION) / GRID_RESOLUTION;

/** One axis of the lines. */
export type GridLines = {
	/** The sorted, distinct coordinates, each on the lines' resolution. */
	lines: Float64Array;
	/** For each line, the smallest value given that lies on it, as given. */
	values: Float64Array;
};

export const toGridLines = (values: readonly number[]): GridLines => {
	const sorted = [...values].sort((a, b) => a - b);
	const lines: number[] = [];
	const lineValues: number[] = [];
	for (const value of sorted) {
		const line = snapToGridResolution(value);
		if (lines.length === 0 || line !== lines[lines.length - 1]) {
			lines.push(line);
			lineValues.push(value);
		}
	}
	return {
		lines: Float64Array.from(lines),
		values: Float64Array.from(lineValues),
	};
};

/**
 * The index of the line `value` lies on.
 *
 * @throws Error for a value no line lies on, which a caller that built the lines
 *   from its own values never asks for
 */
export const indexOfGridLine = (lines: Float64Array, value: number): number => {
	const snapped = snapToGridResolution(value);
	let low = 0;
	let high = lines.length - 1;
	while (low <= high) {
		const middle = (low + high) >> 1;
		const line = lines[middle];
		if (line === snapped) {
			return middle;
		}
		if (line < snapped) {
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}
	throw new Error(`no grid line at ${value}`);
};

/**
 * The lines every route runs on: a point is a crossing of one of `xs` with one of
 * `ys`, and a unit step joins a point to the next line over. What the routes drawn
 * so far occupy, and where the borders lie, is kept per unit step and per point here,
 * so every graph built on the lines (see buildRouteGraph) reads the same.
 */
export type RouteLines = {
	xs: Float64Array;
	ys: Float64Array;
	/** The coordinate each of `xs` stands for, as given (see GridLines.values). */
	xValues: Float64Array;
	/** The same for `ys`. */
	yValues: Float64Array;
	/** How many routes already drawn run along each horizontal unit step; see stepIndex. */
	occupiedH: Uint16Array;
	/** The same for each vertical unit step. */
	occupiedV: Uint16Array;
	/** Where the borders and the crossable bands' sides lie; absent when there are none. */
	borders?: BorderMarks;
};

/** Where the borders lie on the lines, point by point (see pointIndex). */
export type BorderMarks = {
	/** How many borders' vertical sides pass through each point. */
	sidesV: Uint8Array;
	/** How many borders' horizontal sides pass through each point. */
	sidesH: Uint8Array;
	/**
	 * How close each point lies to a border's horizontal side running past it, as the
	 * margin band's weight (1 on the side, 0 a margin away): what a horizontal step
	 * pays for running along a border.
	 */
	nearH: Float64Array;
	/** The same for vertical sides, which a vertical step pays for. */
	nearV: Float64Array;
};

export const pointIndex = (lines: RouteLines, xi: number, yi: number): number =>
	yi * lines.xs.length + xi;

/**
 * The index of the unit step leaving (xi, yi) in `direction`, among the horizontal
 * steps for a horizontal direction and the vertical ones otherwise; -1 when the step
 * would leave the lines.
 */
export const stepIndex = (
	lines: RouteLines,
	xi: number,
	yi: number,
	direction: RouteDirection,
): number => {
	const nx = lines.xs.length;
	const ny = lines.ys.length;
	switch (direction) {
		case 0:
			return yi === 0 ? -1 : xi * (ny - 1) + yi - 1;
		case 1:
			return xi === nx - 1 ? -1 : yi * (nx - 1) + xi;
		case 2:
			return yi === ny - 1 ? -1 : xi * (ny - 1) + yi;
		case 3:
			return xi === 0 ? -1 : yi * (nx - 1) + xi - 1;
	}
};

/** A box placed on the lines: the indices of its four edges among them. */
export type GridSpan = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

export const toGridSpan = (
	lines: Pick<RouteLines, "xs" | "ys">,
	box: BoundingBox,
): GridSpan => ({
	left: indexOfGridLine(lines.xs, box.left),
	right: indexOfGridLine(lines.xs, box.right),
	top: indexOfGridLine(lines.ys, box.top),
	bottom: indexOfGridLine(lines.ys, box.bottom),
});

export const growBox = (box: BoundingBox, amount: number): BoundingBox => ({
	left: box.left - amount,
	top: box.top - amount,
	right: box.right + amount,
	bottom: box.bottom + amount,
});

/** The index of the first line at or past `value`, `lines.length` when none is. */
export const findLineAtOrAfter = (
	lines: Float64Array,
	value: number,
): number => {
	let low = 0;
	let high = lines.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		if (lines[middle] < value) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
};

/** The index of the last line at or before `value`, -1 when none is. */
export const findLineAtOrBefore = (
	lines: Float64Array,
	value: number,
): number => {
	let low = 0;
	let high = lines.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		if (lines[middle] <= value) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low - 1;
};

/**
 * Count a border's sides into the points they pass through (its corners left out),
 * and weigh the points within `margin` of a side and alongside it by how near they
 * are (see BorderMarks.nearH). What lies off the lines is left out.
 */
const addBorder = (
	lines: RouteLines,
	marks: BorderMarks,
	border: BoundingBox,
	margin: number,
): void => {
	const { xs, ys } = lines;
	const nx = xs.length;
	const snapped = {
		left: snapToGridResolution(border.left),
		top: snapToGridResolution(border.top),
		right: snapToGridResolution(border.right),
		bottom: snapToGridResolution(border.bottom),
	};
	for (const x of [snapped.left, snapped.right]) {
		const near = {
			from: findLineAtOrAfter(xs, x - margin),
			to: findLineAtOrAfter(xs, x + margin),
		};
		const sideFrom = findLineAtOrAfter(ys, snapped.top);
		const sideTo = findLineAtOrAfter(ys, snapped.bottom);
		for (let yi = sideFrom; yi < Math.min(sideTo + 1, ys.length); yi += 1) {
			for (let xi = near.from; xi < near.to; xi += 1) {
				const weight = 1 - Math.abs(xs[xi] - x) / margin;
				const point = yi * nx + xi;
				if (weight > marks.nearV[point]) {
					marks.nearV[point] = weight;
				}
				if (
					xs[xi] === x &&
					ys[yi] !== snapped.top &&
					ys[yi] !== snapped.bottom
				) {
					marks.sidesV[point] += 1;
				}
			}
		}
	}
	for (const y of [snapped.top, snapped.bottom]) {
		const near = {
			from: findLineAtOrAfter(ys, y - margin),
			to: findLineAtOrAfter(ys, y + margin),
		};
		const sideFrom = findLineAtOrAfter(xs, snapped.left);
		const sideTo = findLineAtOrAfter(xs, snapped.right);
		for (let yi = near.from; yi < near.to; yi += 1) {
			for (let xi = sideFrom; xi < Math.min(sideTo + 1, xs.length); xi += 1) {
				const weight = 1 - Math.abs(ys[yi] - y) / margin;
				const point = yi * nx + xi;
				if (weight > marks.nearH[point]) {
					marks.nearH[point] = weight;
				}
				if (
					ys[yi] === y &&
					xs[xi] !== snapped.left &&
					xs[xi] !== snapped.right
				) {
					marks.sidesH[point] += 1;
				}
			}
		}
	}
};

/**
 * Count a crossable band's top and bottom sides into the points they pass through
 * where no border's horizontal side does already (its corners left out), and weigh
 * the points within `margin` of them and alongside as addBorder does. Its short sides
 * add nothing. What lies off the lines is left out.
 */
const addBandSides = (
	lines: RouteLines,
	marks: BorderMarks,
	band: BoundingBox,
	margin: number,
): void => {
	const { xs, ys } = lines;
	const nx = xs.length;
	const left = snapToGridResolution(band.left);
	const right = snapToGridResolution(band.right);
	const sideFrom = findLineAtOrAfter(xs, left);
	const sideTo = findLineAtOrAfter(xs, right);
	for (const y of [
		snapToGridResolution(band.top),
		snapToGridResolution(band.bottom),
	]) {
		const nearFrom = findLineAtOrAfter(ys, y - margin);
		const nearTo = findLineAtOrAfter(ys, y + margin);
		for (let yi = nearFrom; yi < nearTo; yi += 1) {
			for (let xi = sideFrom; xi < Math.min(sideTo + 1, nx); xi += 1) {
				const weight = 1 - Math.abs(ys[yi] - y) / margin;
				const point = yi * nx + xi;
				if (weight > marks.nearH[point]) {
					marks.nearH[point] = weight;
				}
				if (
					ys[yi] === y &&
					xs[xi] !== left &&
					xs[xi] !== right &&
					marks.sidesH[point] === 0
				) {
					marks.sidesH[point] = 1;
				}
			}
		}
	}
};

/**
 * The lines on the given coordinates, with nothing drawn on them yet and the borders
 * and the crossable bands' sides counted in.
 *
 * @param margin - How far from a border's side a step running alongside still pays
 *   for it, in px
 * @param crossableBands - Bands whose top and bottom sides cost what a border's side
 *   does to cross and to run alongside, once where a border's side lies on one (see
 *   EdgeRoutingOptions.crossableBands)
 */
export const createRouteLines = (
	xLines: GridLines,
	yLines: GridLines,
	borders: readonly BoundingBox[],
	margin: number,
	crossableBands: readonly BoundingBox[],
): RouteLines => {
	const xs = xLines.lines;
	const ys = yLines.lines;
	const nx = xs.length;
	const ny = ys.length;
	const lines: RouteLines = {
		xs,
		ys,
		xValues: xLines.values,
		yValues: yLines.values,
		occupiedH: new Uint16Array(ny * Math.max(nx - 1, 0)),
		occupiedV: new Uint16Array(nx * Math.max(ny - 1, 0)),
	};
	if (borders.length > 0 || crossableBands.length > 0) {
		const marks: BorderMarks = {
			sidesV: new Uint8Array(nx * ny),
			sidesH: new Uint8Array(nx * ny),
			nearH: new Float64Array(nx * ny),
			nearV: new Float64Array(nx * ny),
		};
		for (const border of borders) {
			addBorder(lines, marks, border, margin);
		}
		// After the borders, so a side a border lies on is counted once.
		for (const band of crossableBands) {
			addBandSides(lines, marks, band, margin);
		}
		lines.borders = marks;
	}
	return lines;
};
