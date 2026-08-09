import { ShapeBodyPolygon, createFrameObject } from "@jiscribe/canvas-sdk";

import { buildCardPoints } from "./buildCardPoints";
import type { CardState } from "../../state/card/CardState";

/** Card presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Card = createFrameObject<CardState>((state, shape) => (
	<ShapeBodyPolygon
		{...shape}
		points={buildCardPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
