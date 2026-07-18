import { buildCardPoints } from "./buildCardPoints";
import { CardElement } from "./CardStyled";
import type { CardState } from "../../../../states/objects/flowchart/card/CardState";
import { createFrameObject } from "../../base/createFrameObject";

/** Card presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Card = createFrameObject<CardState>((state, shape) => (
	<CardElement
		{...shape}
		points={buildCardPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
