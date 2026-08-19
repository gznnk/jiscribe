import type { Point } from "@jiscribe/geometry";

/**
 * Walks an absolute SVG path into its points, control points included, so a
 * shape builder can be asserted against its bounding box.
 *
 * `V` / `H` take a single scalar, so the numbers cannot simply be paired up:
 * the current point has to be tracked. Supports the commands the shape
 * builders emit (M / L / C / V / H / Z).
 */
export const parseSvgPathPoints = (path: string): Point[] => {
	const tokens = path.trim().split(/\s+/);
	const points: Point[] = [];
	let command = "";
	let current: Point = { x: 0, y: 0 };

	for (let i = 0; i < tokens.length; i++) {
		if (/^[A-Z]$/.test(tokens[i])) {
			command = tokens[i];
			continue;
		}
		if (command === "V") {
			current = { x: current.x, y: Number(tokens[i]) };
		} else if (command === "H") {
			current = { x: Number(tokens[i]), y: current.y };
		} else {
			current = { x: Number(tokens[i]), y: Number(tokens[++i]) };
		}
		points.push(current);
	}
	return points;
};
