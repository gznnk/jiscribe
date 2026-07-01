import { RectElement } from "./RectStyled";
import type { RectState } from "../../../../states/objects/primitives/rect/RectState";
import { createFrameObject } from "../../base/createFrameObject";

/** Renders a Rect (Frame-family shared logic lives in createFrameObject; only the shape is swapped in). */
export const Rect = createFrameObject<RectState>((state, shape) => (
	<RectElement
		{...shape}
		x={-state.width / 2}
		y={-state.height / 2}
		width={state.width}
		height={state.height}
		rx={state.rx}
	/>
));
