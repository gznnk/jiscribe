import { createFrameObject } from "@jiscribe/canvas-sdk";

import { buildServerFigure } from "./buildServerFigure";
import type { ServerState } from "../../state/server/ServerState";
import { BelowLabelPictogram } from "../shared/BelowLabelPictogram";

/**
 * Server presentation: the drawing takes the whole box and the label hangs
 * under it (Frame-family shared logic lives in createFrameObject; only the shape
 * is swapped in).
 */
export const Server = createFrameObject<ServerState>((state, shape) => (
	<BelowLabelPictogram
		figure={buildServerFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
		state={state}
	/>
));
