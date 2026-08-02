import { calcShieldCurve } from "./calcShieldCurve";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";

/**
 * Lays out a shield over the bounding box whose top-left corner is at (x, y):
 * one closed silhouette, no detail lines. Shared by the object renderer
 * (centered origin), the draw-drag preview that reuses it, and the stencil icon.
 */
export const buildShieldFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const { shoulderY, rightFlank, leftFlank } = calcShieldCurve(
		x,
		y,
		width,
		height,
	);
	const [, rightControl1, rightControl2, tip] = rightFlank;
	const [, leftControl1, leftControl2, leftShoulder] = leftFlank;
	return {
		body: [
			`M ${x} ${y} H ${x + width} V ${shoulderY} ` +
				`C ${rightControl1.x} ${rightControl1.y} ${rightControl2.x} ${rightControl2.y} ${tip.x} ${tip.y} ` +
				`C ${leftControl1.x} ${leftControl1.y} ${leftControl2.x} ${leftControl2.y} ${leftShoulder.x} ${leftShoulder.y} Z`,
		],
	};
};
