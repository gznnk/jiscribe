export type ActorFigure = {
	headCx: number;
	headCy: number;
	headR: number;
	/** Torso, arms, and legs as stroked open subpaths (no fill). */
	limbsPath: string;
};

/**
 * Lays out the stick figure over the whole bounding box whose top-left corner is
 * at (x, y): the head sits on the top edge and the feet reach the bottom one. The
 * label is not part of the box (it hangs below it — calcActorTextRegion), so
 * nothing here has to be left free for it. Shared by the object renderer
 * (centered origin) and the draw-drag preview, which reuses that renderer.
 */
export const buildActorFigure = (
	x: number,
	y: number,
	width: number,
	height: number,
): ActorFigure => {
	const centerX = x + width / 2;
	const headR = height * 0.14;
	const neckY = y + headR * 2;
	const armY = y + height * 0.36;
	const hipY = y + height * 0.62;
	const footY = y + height;
	const armHalf = Math.min(width * 0.3, height * 0.32);
	const legHalf = Math.min(width * 0.24, height * 0.28);
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
