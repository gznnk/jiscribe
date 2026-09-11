import type { Point } from "@jiscribe/geometry";

/**
 * Reading an SVG path back as geometry, so a shape drawn by a path can be held
 * against the outline connectors follow. Shared by the silhouette tests of the
 * shapes written twice that way.
 */

/** One `A` command of the path, with the point it starts from. */
export type PathArc = {
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
export const parsePathArcs = (d: string): PathArc[] => {
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
export const calcArcX = (arc: PathArc, y: number): number => {
	const centerY = (arc.start.y + arc.end.y) / 2;
	const t = (y - centerY) / arc.ry;
	const bowsRight = arc.end.y > arc.start.y === arc.sweep;
	return (
		arc.start.x +
		(bowsRight ? arc.rx : -arc.rx) * Math.sqrt(Math.max(0, 1 - t * t))
	);
};
