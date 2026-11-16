import { createFrameObject } from "@jiscribe/canvas-sdk";

import { buildLightningFigure } from "./buildLightningFigure";
import type { LightningState } from "../../state/lightning/LightningState";
import { BelowLabelPictogram } from "../shared/BelowLabelPictogram";

/**
 * Lightning presentation: the drawing takes the whole box and the label hangs
 * under it (Frame-family shared logic lives in createFrameObject; only the shape
 * is swapped in).
 */
export const Lightning = createFrameObject<LightningState>((state, shape) => (
	<BelowLabelPictogram
		figure={buildLightningFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
		state={state}
	/>
));
