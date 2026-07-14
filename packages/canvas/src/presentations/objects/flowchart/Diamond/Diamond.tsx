import { DiamondElement } from "./DiamondStyled";
import type { DiamondState } from "../../../../states/objects/flowchart/diamond/DiamondState";
import { createFrameObject } from "../../base/createFrameObject";

/**
 * Builds the polygon point list for a diamond centered at the origin, with
 * vertices at top, right, bottom, and left. (Text region: calcDiamondTextRegion.)
 */
const buildDiamondPoints = (width: number, height: number): string => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	return [
		`0,${-halfHeight}`,
		`${halfWidth},0`,
		`0,${halfHeight}`,
		`${-halfWidth},0`,
	].join(" ");
};

/** Diamond presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Diamond = createFrameObject<DiamondState>((state, shape) => (
	<DiamondElement
		{...shape}
		points={buildDiamondPoints(state.width, state.height)}
	/>
));
