import { createFrameObject } from "@workspace/canvas/unstable";

import { buildLockFigure } from "./buildLockFigure";
import type { LockState } from "../../state/lock/LockState";
import { BelowLabelPictogram } from "../shared/BelowLabelPictogram";

/**
 * Lock presentation: the drawing takes the whole box and the label hangs
 * under it (Frame-family shared logic lives in createFrameObject; only the shape
 * is swapped in).
 */
export const Lock = createFrameObject<LockState>((state, shape) => (
	<BelowLabelPictogram
		figure={buildLockFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
		state={state}
	/>
));
