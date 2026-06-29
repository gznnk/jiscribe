import { RectElement } from "./RectStyled";
import type { RectState } from "../../../../states/objects/primitives/rect/RectState";
import { createFrameObject } from "../../base/createFrameObject";

/** Rect の表示（Frame 系共通ロジックは createFrameObject に集約、形状だけ差し替え）。 */
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
