import { SUBROUTINE_BAR_RATIO } from "../../../../schemas/objects/flowchart/subroutine/SubroutineDoc";

/**
 * Builds the predefined-process path: an outer rectangle plus two vertical bars
 * inset from the left and right edges. The bar subpaths enclose no area, so they
 * stroke as lines without affecting the fill. Shared by the object renderer
 * (centered origin) and the draw-drag preview.
 */
export const buildSubroutinePath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const bar = width * SUBROUTINE_BAR_RATIO;
	return (
		`M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z ` +
		`M ${x + bar} ${y} V ${y + height} ` +
		`M ${x + width - bar} ${y} V ${y + height}`
	);
};
