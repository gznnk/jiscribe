import { buildHexagonPoints } from "./buildHexagonPoints";
import { HexagonElement } from "./HexagonStyled";
import type { HexagonState } from "../../../../states/objects/primitives/hexagon/HexagonState";
import { createFrameObject } from "../../base/createFrameObject";

/** Hexagon presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Hexagon = createFrameObject<HexagonState>((state, shape) => (
	<HexagonElement
		{...shape}
		points={buildHexagonPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
