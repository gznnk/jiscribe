import { createFrameObject } from "@jiscribe/canvas-sdk";

import { buildQueueFigure } from "./buildQueueFigure";
import type { QueueState } from "../../state/queue/QueueState";
import { BelowLabelPictogram } from "../shared/BelowLabelPictogram";

/**
 * Queue presentation: the drawing takes the whole box and the label hangs
 * under it (Frame-family shared logic lives in createFrameObject; only the shape
 * is swapped in).
 */
export const Queue = createFrameObject<QueueState>((state, shape) => (
	<BelowLabelPictogram
		figure={buildQueueFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
		state={state}
	/>
));
