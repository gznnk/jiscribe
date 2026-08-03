import { createFrameObject } from "@workspace/canvas-sdk";

import { buildPackageFigure } from "./buildPackageFigure";
import type { PackageState } from "../../state/package/PackageState";
import { BelowLabelPictogram } from "../shared/BelowLabelPictogram";

/**
 * Package presentation: the drawing takes the whole box and the label hangs
 * under it (Frame-family shared logic lives in createFrameObject; only the shape
 * is swapped in).
 */
export const Package = createFrameObject<PackageState>((state, shape) => (
	<BelowLabelPictogram
		figure={buildPackageFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
		state={state}
	/>
));
