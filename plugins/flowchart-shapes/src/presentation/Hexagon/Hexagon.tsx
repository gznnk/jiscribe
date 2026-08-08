import { ShapeBodyPolygon, createFrameObject } from "@workspace/canvas-sdk";

import { buildHexagonPoints } from "./buildHexagonPoints";
import type { HexagonState } from "../../state/hexagon/HexagonState";

/** Hexagon presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Hexagon = createFrameObject<HexagonState>((state, shape) => (
	<ShapeBodyPolygon
		{...shape}
		points={buildHexagonPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
