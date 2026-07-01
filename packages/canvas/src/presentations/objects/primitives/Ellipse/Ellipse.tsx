import { EllipseElement } from "./EllipseStyled";
import type { EllipseState } from "../../../../states/objects/primitives/ellipse/EllipseState";
import { createFrameObject } from "../../base/createFrameObject";

/** Renders an Ellipse (Frame-family shared logic lives in createFrameObject; only the shape is swapped in). */
export const Ellipse = createFrameObject<EllipseState>((state, shape) => (
	<EllipseElement
		{...shape}
		cx={0}
		cy={0}
		rx={state.width / 2}
		ry={state.height / 2}
	/>
));
