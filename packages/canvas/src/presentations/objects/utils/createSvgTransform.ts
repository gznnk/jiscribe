import { degreesToRadians } from "@workspace/geometry";

export const createSvgTransform = (
	sx: number,
	sy: number,
	rotationDegrees: number,
	tx: number,
	ty: number,
): string => {
	const theta = degreesToRadians(rotationDegrees);
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
