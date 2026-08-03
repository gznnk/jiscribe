import { createFrameObject } from "@workspace/canvas-sdk";

import { buildCloudPath } from "./buildCloudPath";
import { CloudElement } from "./CloudStyled";
import type { CloudState } from "../../state/cloud/CloudState";

/** Cloud presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Cloud = createFrameObject<CloudState>((state, shape) => (
	<CloudElement
		{...shape}
		d={buildCloudPath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
