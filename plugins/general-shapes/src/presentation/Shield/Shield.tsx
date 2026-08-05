import { createFrameObject } from "@workspace/canvas-sdk";

import { buildShieldFigure } from "./buildShieldFigure";
import type { ShieldState } from "../../state/shield/ShieldState";
import { Pictogram } from "../shared/Pictogram";

/** Shield presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Shield = createFrameObject<ShieldState>((state, shape) => (
	<Pictogram
		figure={buildShieldFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
	/>
));
