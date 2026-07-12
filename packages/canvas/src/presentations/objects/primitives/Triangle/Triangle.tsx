import { buildTrianglePoints } from "./buildTrianglePoints";
import { TriangleElement } from "./TriangleStyled";
import type { TriangleState } from "../../../../states/objects/primitives/triangle/TriangleState";
import { createFrameObject } from "../../base/createFrameObject";

/** Triangle presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Triangle = createFrameObject<TriangleState>((state, shape) => (
	<TriangleElement
		{...shape}
		points={buildTrianglePoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
