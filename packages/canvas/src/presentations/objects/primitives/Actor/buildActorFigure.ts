import { ACTOR_FIGURE_RATIO } from "../../../../schemas/objects/primitives/actor/ActorDoc";

export type ActorFigure = {
	headCx: number;
	headCy: number;
	headR: number;
	/** Torso, arms, and legs as stroked open subpaths (no fill). */
	limbsPath: string;
};

/**
 * Lays out the stick figure inside the figure band (top ACTOR_FIGURE_RATIO of
 * the bounding box whose top-left corner is at (x, y)), leaving the band below
 * for the label. Shared by the object renderer (centered origin) and the
 * draw-drag preview.
 */
export const buildActorFigure = (
	x: number,
	y: number,
	width: number,
	height: number,
): ActorFigure => {
	const figureHeight = height * ACTOR_FIGURE_RATIO;
	const centerX = x + width / 2;
	const headR = figureHeight * 0.14;
	const neckY = y + headR * 2;
	const armY = y + figureHeight * 0.36;
	const hipY = y + figureHeight * 0.62;
	const footY = y + figureHeight;
	const armHalf = Math.min(width * 0.3, figureHeight * 0.32);
	const legHalf = Math.min(width * 0.24, figureHeight * 0.28);
	return {
		headCx: centerX,
		headCy: y + headR,
		headR,
		limbsPath:
			`M ${centerX} ${neckY} V ${hipY} ` +
			`M ${centerX - armHalf} ${armY} H ${centerX + armHalf} ` +
			`M ${centerX} ${hipY} L ${centerX - legHalf} ${footY} ` +
			`M ${centerX} ${hipY} L ${centerX + legHalf} ${footY}`,
	};
};
