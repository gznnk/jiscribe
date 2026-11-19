import {
	CROW_FOOT_HALF_HEIGHT,
	CROW_FOOT_LENGTH,
} from "@jiscribe/doc/model/objects/arrows/arrowHeadDimensions";

/**
 * Path builders for the ER crow's foot cardinality marks, laid out on the
 * dimensions `@jiscribe/doc` gives them (arrowHeadDimensions): the tip at (0,0)
 * and the mark trailing toward -x.
 */

/**
 * Builds the spine running up to the tip.
 *
 * @param from - Distance (local units) from the tip at which the spine starts, measured toward -x. For marks ending in a hollow circle this is the circle's *near* edge, not the inset, so the spine does not cross the circle's interior; for the others it equals the inset.
 * @returns An SVG path data fragment starting with a `M` command.
 */
export const buildCrowFootSpine = (from: number): string =>
	`M ${-from},0 L 0,0`;

/**
 * Builds the two outer prongs of the crow's foot. The middle prong is the
 * spine, so it is not repeated here.
 *
 * @returns An SVG path data fragment starting with a `M` command.
 */
export const buildCrowFootProngs = (): string =>
	`M 0,${-CROW_FOOT_HALF_HEIGHT} L ${-CROW_FOOT_LENGTH},0 L 0,${CROW_FOOT_HALF_HEIGHT}`;

/**
 * Builds a cardinality bar: a segment perpendicular to the line.
 *
 * @param distance - Distance (local units) from the tip, measured toward -x; positive moves away from the tip.
 * @returns An SVG path data fragment starting with a `M` command.
 */
export const buildCrowFootBar = (distance: number): string =>
	`M ${-distance},${-CROW_FOOT_HALF_HEIGHT} L ${-distance},${CROW_FOOT_HALF_HEIGHT}`;
