import { createFrameObject } from "@workspace/canvas-sdk";

import { buildEnvelopeFigure } from "./buildEnvelopeFigure";
import type { EnvelopeState } from "../../state/envelope/EnvelopeState";
import { BelowLabelPictogram } from "../shared/BelowLabelPictogram";

/**
 * Envelope presentation: the drawing takes the whole box and the label hangs
 * under it (Frame-family shared logic lives in createFrameObject; only the shape
 * is swapped in).
 */
export const Envelope = createFrameObject<EnvelopeState>((state, shape) => (
	<BelowLabelPictogram
		figure={buildEnvelopeFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
		state={state}
	/>
));
