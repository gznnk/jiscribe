import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import { buildEllipsePath } from "../shared/pictogramPaths";

/** Teeth around the rim. */
const GEAR_TOOTH_COUNT = 8;

/** Radius at the root of a tooth, as a fraction of the tip radius. */
const GEAR_ROOT_RADIUS_RATIO = 0.74;

/** Half-widths of a tooth's tip and of the gap beside it, as fractions of the tooth pitch. */
const GEAR_TIP_HALF_ANGLE_RATIO = 0.2;
const GEAR_ROOT_HALF_ANGLE_RATIO = 0.3;

/** The bore, as a fraction of the tip radius. */
const GEAR_BORE_RATIO = 0.3;

/**
 * Lays out a gear over the bounding box whose top-left corner is at (x, y). The
 * teeth are placed on the box's inscribed ellipse rather than on a circle, so a
 * stretched box gives a stretched gear instead of a circle floating in empty
 * space. The bore rides along as a second subpath of the same body path, which
 * is why the figure asks for `fill-rule: evenodd` — it has to be punched out of
 * the fill, not painted over it. Shared by the object renderer (centered origin),
 * the draw-drag preview that reuses it, and the stencil icon.
 */
export const buildGearFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const centerX = x + width / 2;
	const centerY = y + height / 2;
	const radiusX = width / 2;
	const radiusY = height / 2;
	const pitch = (Math.PI * 2) / GEAR_TOOTH_COUNT;
	const tipHalfAngle = pitch * GEAR_TIP_HALF_ANGLE_RATIO;
	const rootHalfAngle = pitch * GEAR_ROOT_HALF_ANGLE_RATIO;

	const rimPoint = (radiusRatio: number, angle: number): string =>
		`${centerX + radiusX * radiusRatio * Math.cos(angle)} ${centerY + radiusY * radiusRatio * Math.sin(angle)}`;

	const teeth = Array.from({ length: GEAR_TOOTH_COUNT }, (_, index) => {
		const angle = index * pitch;
		return (
			`${index === 0 ? "M" : "L"} ${rimPoint(1, angle - tipHalfAngle)} ` +
			`L ${rimPoint(1, angle + tipHalfAngle)} ` +
			`L ${rimPoint(GEAR_ROOT_RADIUS_RATIO, angle + rootHalfAngle)} ` +
			`L ${rimPoint(GEAR_ROOT_RADIUS_RATIO, angle + pitch - rootHalfAngle)}`
		);
	}).join(" ");

	const bore = buildEllipsePath(
		centerX,
		centerY,
		radiusX * GEAR_BORE_RATIO,
		radiusY * GEAR_BORE_RATIO,
	);

	return { body: [`${teeth} Z ${bore}`], fillRule: "evenodd" };
};
