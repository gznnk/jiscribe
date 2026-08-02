import { createFrameObject } from "@workspace/canvas/unstable";

import { buildGearFigure } from "./buildGearFigure";
import type { GearState } from "../../state/gear/GearState";
import { BelowLabelPictogram } from "../shared/BelowLabelPictogram";

/**
 * Gear presentation: the drawing takes the whole box and the label hangs
 * under it (Frame-family shared logic lives in createFrameObject; only the shape
 * is swapped in).
 */
export const Gear = createFrameObject<GearState>((state, shape) => (
	<BelowLabelPictogram
		figure={buildGearFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
		state={state}
	/>
));
