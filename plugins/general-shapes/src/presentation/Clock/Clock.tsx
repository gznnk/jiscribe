import { createFrameObject } from "@jiscribe/canvas-sdk";

import { buildClockFigure } from "./buildClockFigure";
import type { ClockState } from "../../state/clock/ClockState";
import { BelowLabelPictogram } from "../shared/BelowLabelPictogram";

/**
 * Clock presentation: the drawing takes the whole box and the label hangs
 * under it (Frame-family shared logic lives in createFrameObject; only the shape
 * is swapped in).
 */
export const Clock = createFrameObject<ClockState>((state, shape) => (
	<BelowLabelPictogram
		figure={buildClockFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
		state={state}
	/>
));
