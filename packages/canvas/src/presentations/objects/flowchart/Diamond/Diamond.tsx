import { buildDiamondPoints } from "./buildDiamondPoints";
import { DiamondElement } from "./DiamondStyled";
import type { DiamondState } from "../../../../states/objects/flowchart/diamond/DiamondState";
import { createFrameObject } from "../../base/createFrameObject";

/** Diamond presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Diamond = createFrameObject<DiamondState>((state, shape) => (
	<DiamondElement
		{...shape}
		points={buildDiamondPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
