import { createFrameObject } from "@workspace/canvas/unstable";

import { buildCardPoints } from "./buildCardPoints";
import { CardElement } from "./CardStyled";
import type { CardState } from "../../state/card/CardState";

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
