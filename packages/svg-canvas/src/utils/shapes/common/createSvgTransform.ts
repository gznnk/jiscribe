/**
 * Creates an SVG transform attribute string from specified parameters.
 *
 * @param sx - Scale factor in x-direction
 * @param sy - Scale factor in y-direction
 * @param theta - Rotation angle in radians
 * @param tx - Translation distance in x-direction
 * @param ty - Translation distance in y-direction
 * @returns SVG transform attribute string in matrix format
 */
export const createSvgTransform = (
	sx: number,
	sy: number,
	theta: number,
	tx: number,
	ty: number,
): string => {
	const cosTheta = Math.cos(theta);
	const sinTheta = Math.sin(theta);

	const a = sx * cosTheta;
	const b = sx * sinTheta;
	const c = -sy * sinTheta;
	const d = sy * cosTheta;
	const e = tx;
	const f = ty;

	return `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
};
