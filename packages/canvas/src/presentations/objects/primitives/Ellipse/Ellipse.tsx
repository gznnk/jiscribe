import { EllipseElement } from "./EllipseStyled";
import type { EllipseState } from "../../../../states/objects/primitives/ellipse/EllipseState";
import { createFrameObject } from "../../base/createFrameObject";

/** Ellipse の表示（Frame 系共通ロジックは createFrameObject に集約、形状だけ差し替え）。 */
export const Ellipse = createFrameObject<EllipseState>((state, shape) => (
	<EllipseElement
		{...shape}
		cx={0}
		cy={0}
		rx={state.width / 2}
		ry={state.height / 2}
	/>
));
