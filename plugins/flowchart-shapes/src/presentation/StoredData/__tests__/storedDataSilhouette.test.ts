import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import type { Dimensions, Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { buildStoredDataPath } from "../buildStoredDataPath";
import { storedDataOutline } from "../storedDataOutline";

/**
 * The stored-data silhouette is written twice: the renderer draws two SVG arcs
 * (buildStoredDataPath) and the connectors follow a sampled polyline
 * (storedDataOutline). Both caps bow the same way, so flipping one arc's sweep
 * flag leaves a drawing that still looks right — the cap merely bulges instead
 * of biting in — while connectors meet the shape on the opposite side and run
 * through its middle. Neither implementation can catch that alone, so the arcs
 * are read back out of the path here and the outline is measured against them.
 */

/**
 * The outline reads nothing but width/height; its declaration types it against
 * the shape's whole State, so the cast is what lets a bare box stand in for one.
 */
const calcOutline = storedDataOutline as ObjectOutlineCalculator<Dimensions>;

/** One `A` command of the path, with the point it starts from. */
type PathArc = {
	readonly start: Point;
	readonly rx: number;
	readonly ry: number;
	/** SVG's sweep flag: true sweeps clockwise, y pointing down. */
	readonly sweep: boolean;
	readonly end: Point;
};

/**
 * Reads the path's arcs back as geometry. Only the commands this path is built
 * from are understood (`M` / `H` / `A` / `Z`, absolute, space-separated); an
 * unknown one throws rather than being skipped, since a silently dropped command
 * would leave the arcs below describing a shape the renderer no longer draws.
 */
const parsePathArcs = (d: string): PathArc[] => {
	const tokens = d.split(" ").filter((token) => token !== "");
	const arcs: PathArc[] = [];
	let current: Point = { x: 0, y: 0 };
	let index = 0;
	const take = (): number => {
		const value = Number(tokens[index++]);
		if (Number.isNaN(value)) {
			throw new Error(`"${d}" holds a non-numeric argument at ${index - 1}`);
		}
		return value;
	};
	while (index < tokens.length) {
		const command = tokens[index++];
		switch (command) {
			case "M":
				current = { x: take(), y: take() };
				break;
			case "H":
				current = { x: take(), y: current.y };
				break;
			case "A": {
				const rx = take();
				const ry = take();
				// x-axis rotation and the large-arc flag; both are 0 for half ellipses.
				take();
				take();
				const sweep = take() === 1;
				const end = { x: take(), y: take() };
				arcs.push({ start: current, rx, ry, sweep, end });
				current = end;
				break;
			}
			case "Z":
				break;
			default:
				throw new Error(`"${d}" uses the unsupported command "${command}"`);
		}
	}
	return arcs;
};

/**
 * The x the arc reaches at height y. Both arcs run between the same x, so each
 * is exactly half an ellipse centered midway between its endpoints, and which
 * side of that center it bows to follows from the sweep flag and the direction
 * of travel.
 */
const calcArcX = (arc: PathArc, y: number): number => {
	const centerY = (arc.start.y + arc.end.y) / 2;
	const t = (y - centerY) / arc.ry;
	const bowsRight = arc.end.y > arc.start.y === arc.sweep;
	return (
		arc.start.x +
		(bowsRight ? arc.rx : -arc.rx) * Math.sqrt(Math.max(0, 1 - t * t))
	);
};

/** The path's two vertical caps, told apart by which x each stands at. */
const capsOf = (
	width: number,
	height: number,
): { leftCap: PathArc; rightCap: PathArc } => {
	const arcs = parsePathArcs(
		buildStoredDataPath(-width / 2, -height / 2, width, height),
	);
	expect(arcs).toHaveLength(2);
	for (const arc of arcs) {
		// The model above holds only for a half ellipse standing on its own axis.
		expect(arc.start.x).toBeCloseTo(arc.end.x, 9);
		expect(Math.abs(arc.end.y - arc.start.y) / 2).toBeCloseTo(arc.ry, 9);
	}
	const [first, second] = arcs;
	return first.start.x < second.start.x
		? { leftCap: first, rightCap: second }
		: { leftCap: second, rightCap: first };
};

/**
 * How far inside the drawn shape the point is: 0 on its edge, negative outside.
 * The caps are the left and right edges, the straight top and bottom the rest.
 */
const calcDepthInPath = (
	point: Point,
	height: number,
	{ leftCap, rightCap }: { leftCap: PathArc; rightCap: PathArc },
): number =>
	Math.min(
		point.x - calcArcX(leftCap, point.y),
		calcArcX(rightCap, point.y) - point.x,
		height / 2 - Math.abs(point.y),
	);

const SIZES: ReadonlyArray<[number, number]> = [
	[140, 80],
	[100, 100],
	[80, 240],
	[400, 60],
];

describe("stored-data silhouette", () => {
	it("puts every outline point on the edge the renderer draws, at any aspect ratio", () => {
		for (const [width, height] of SIZES) {
			const caps = capsOf(width, height);
			for (const point of calcOutline({ width, height })) {
				expect(
					calcDepthInPath(point, height, caps),
					`${width}x${height} at (${point.x}, ${point.y})`,
				).toBeCloseTo(0, 9);
			}
		}
	});

	it("bows both caps the same way, so the shape leans left", () => {
		// Read off the path: a flipped sweep flag turns the right cap's bite into a
		// bulge, which the first test then catches on the outline.
		const { leftCap, rightCap } = capsOf(140, 80);
		expect(calcArcX(leftCap, 0)).toBeLessThan(leftCap.start.x);
		expect(calcArcX(rightCap, 0)).toBeLessThan(rightCap.start.x);
	});

	it("samples both cap apexes, the points a connector aims at edge-on", () => {
		const { leftCap, rightCap } = capsOf(140, 80);
		const atMidHeight = calcOutline({ width: 140, height: 80 })
			.filter((point) => Math.abs(point.y) < 1e-9)
			.map((point) => point.x)
			.sort((a, b) => a - b);
		expect(atMidHeight).toHaveLength(2);
		expect(atMidHeight[0]).toBeCloseTo(calcArcX(leftCap, 0), 9);
		expect(atMidHeight[1]).toBeCloseTo(calcArcX(rightCap, 0), 9);
	});
});
