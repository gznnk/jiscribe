import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { DB_CAP_RATIO } from "../../../schema/db/DbDoc";
import { buildDbPaths } from "../buildDbPaths";
import { dbOutline } from "../dbOutline";

/**
 * The cylinder silhouette is written twice: the renderer draws two SVG arcs
 * (buildDbPaths) and the connectors follow a sampled polyline (dbOutline). A cap
 * that bulges the wrong way, or a cap depth that stops following the height,
 * leaves both files self-consistent and the bounding box intact — the shape
 * turns into a spool, still touching all four sides, and connectors then meet it
 * well inside its top and bottom. Neither implementation can catch that alone,
 * so the arcs are read back out of the path here and the outline is measured
 * against them.
 */

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
 * Reads the path's arcs back as geometry. Only the commands these paths are
 * built from are understood (`M` / `L` / `A` / `Z`, absolute, space-separated);
 * an unknown one throws rather than being skipped, since a silently dropped
 * command would leave the arcs below describing a shape the renderer no longer
 * draws.
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
			case "L":
				current = { x: take(), y: take() };
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
 * The y the arc reaches at horizontal position x. Both caps run between the same
 * y, so each is exactly half an ellipse centered midway between its endpoints,
 * and which side of that center it bulges to follows from the sweep flag and the
 * direction of travel.
 */
const calcArcY = (arc: PathArc, x: number): number => {
	const centerX = (arc.start.x + arc.end.x) / 2;
	const t = (x - centerX) / arc.rx;
	const bulgesDown = arc.end.x > arc.start.x !== arc.sweep;
	return (
		arc.start.y +
		(bulgesDown ? arc.ry : -arc.ry) * Math.sqrt(Math.max(0, 1 - t * t))
	);
};

/** The drawn caps: the body's two bulges, plus the stroked-only front edge. */
const capsOf = (
	width: number,
	height: number,
): { topCap: PathArc; bottomCap: PathArc; capEdge: PathArc } => {
	const { bodyPath, capEdgePath } = buildDbPaths(width, height);
	const bodyArcs = parsePathArcs(bodyPath);
	const capEdgeArcs = parsePathArcs(capEdgePath);
	expect(bodyArcs).toHaveLength(2);
	expect(capEdgeArcs).toHaveLength(1);
	for (const arc of [...bodyArcs, ...capEdgeArcs]) {
		// The model above holds only for a half ellipse standing on its own axis.
		expect(arc.start.y).toBeCloseTo(arc.end.y, 9);
		expect(Math.abs(arc.end.x - arc.start.x) / 2).toBeCloseTo(arc.rx, 9);
	}
	const [first, second] = bodyArcs;
	const [topCap, bottomCap] =
		first.start.y < second.start.y ? [first, second] : [second, first];
	return { topCap, bottomCap, capEdge: capEdgeArcs[0] };
};

/**
 * How far inside the drawn body the point is: 0 on its edge, negative outside.
 * The caps are the top and bottom edges, the box sides the rest.
 */
const calcDepthInPath = (
	point: Point,
	width: number,
	{ topCap, bottomCap }: { topCap: PathArc; bottomCap: PathArc },
): number =>
	Math.min(
		point.y - calcArcY(topCap, point.x),
		calcArcY(bottomCap, point.x) - point.y,
		width / 2 - Math.abs(point.x),
	);

const SIZES: ReadonlyArray<[number, number]> = [
	[100, 80],
	[100, 100],
	[60, 300],
	[400, 60],
];

describe("db silhouette", () => {
	it("puts every outline point on the edge the renderer draws, at any aspect ratio", () => {
		for (const [width, height] of SIZES) {
			const caps = capsOf(width, height);
			for (const point of dbOutline({ width, height })) {
				expect(
					calcDepthInPath(point, width, caps),
					`${width}x${height} at (${point.x}, ${point.y})`,
				).toBeCloseTo(0, 9);
			}
		}
	});

	it("bulges both body caps away from the middle", () => {
		// Read off the path: a flipped sweep flag dishes a cap inwards, which the
		// bounding box alone cannot tell apart, and the first test then catches on
		// the outline.
		const { topCap, bottomCap } = capsOf(100, 80);
		expect(calcArcY(topCap, 0)).toBeLessThan(topCap.start.y);
		expect(calcArcY(bottomCap, 0)).toBeGreaterThan(bottomCap.start.y);
	});

	it("curves the front cap edge the same way as the bottom, so the box reads as a cylinder", () => {
		// The visible halves of both cap ellipses are the ones facing the viewer:
		// flip the front edge and the top turns into a cone seen from below.
		const { topCap, bottomCap, capEdge } = capsOf(100, 80);
		expect(capEdge.start).toEqual(topCap.start);
		expect(capEdge.end).toEqual(topCap.end);
		expect(capEdge.rx).toBeCloseTo(topCap.rx, 9);
		expect(capEdge.ry).toBeCloseTo(topCap.ry, 9);
		expect(calcArcY(capEdge, 0)).toBeGreaterThan(capEdge.start.y);
		expect(calcArcY(bottomCap, 0)).toBeGreaterThan(bottomCap.start.y);
		// It stays inside the body, where the fill is, rather than crossing it.
		expect(calcArcY(capEdge, 0)).toBeLessThan(bottomCap.start.y);
	});

	it("sizes both caps from the height, so the perspective holds as the box stretches", () => {
		// A cap radius fixed in absolute terms, or taken from the width, flattens or
		// swallows the body at the far ratios. DB_CAP_RATIO is also what the text
		// region insets by, so the two cannot drift apart.
		for (const [width, height] of SIZES) {
			const { topCap, bottomCap } = capsOf(width, height);
			expect(topCap.ry).toBeCloseTo(height * DB_CAP_RATIO, 9);
			expect(bottomCap.ry).toBeCloseTo(topCap.ry, 9);
			const atSides = dbOutline({ width, height }).filter(
				(point) => Math.abs(Math.abs(point.x) - width / 2) < 1e-9,
			);
			// The straight sides start where each cap reaches the box edge: one point
			// per cap per side.
			expect(atSides).toHaveLength(4);
			for (const point of atSides) {
				expect(Math.abs(point.y)).toBeCloseTo(height / 2 - topCap.ry, 9);
			}
		}
	});
});
