import { createFrameObject } from "@jiscribe/canvas-sdk";

import { buildBotFigure } from "./buildBotFigure";
import type { BotState } from "../../state/bot/BotState";
import { BelowLabelPictogram } from "../shared/BelowLabelPictogram";

/**
 * Bot presentation: the drawing takes the whole box and the label hangs
 * under it (Frame-family shared logic lives in createFrameObject; only the shape
 * is swapped in).
 */
export const Bot = createFrameObject<BotState>((state, shape) => (
	<BelowLabelPictogram
		figure={buildBotFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
		state={state}
	/>
));
