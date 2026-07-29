import { ARROW_SIZE } from "../../ArrowConstants";

/**
 * Shared geometry for the ER crow's foot cardinality marks.
 *
 * All five marks are laid out on the same axis as the other arrows: the tip is
 * at (0,0) and the mark trails toward -x. Each mark draws its own spine (the
 * segment from its rearmost element up to the tip) rather than relying on the
 * connector line, so the line can be inset past the whole mark. That keeps the
 * hollow "zero" circle readable without depending on the background color, the
 * same reason the other hollow arrows are inset (see `getArrowLineInset`).
 */

/** Run of the crow's foot prongs along the line. */
export const CROW_FOOT_LENGTH = ARROW_SIZE;

/** Half height of the prong spread at the tip, and of the cardinality bars. */
export const CROW_FOOT_HALF_HEIGHT = ARROW_SIZE / 2;

/** Clearance between two adjacent elements of a mark (edge to edge). */
export const CROW_FOOT_MARK_GAP = ARROW_SIZE * 0.45;

/** Radius of the hollow circle denoting the "zero" (optional) lower bound. */
export const CROW_FOOT_CIRCLE_RADIUS = ARROW_SIZE * 0.3;

/** Distance from the tip to the leading bar of the marks that have no prongs. */
export const CROW_FOOT_BAR_OFFSET = ARROW_SIZE * 0.45;

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
