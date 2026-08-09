import { ShapeBodyPolygon, createFrameObject } from "@jiscribe/canvas-sdk";

import { buildManualInputPoints } from "./buildManualInputPoints";
import type { ManualInputState } from "../../state/manualInput/ManualInputState";

/** ManualInput presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const ManualInput = createFrameObject<ManualInputState>(
	(state, shape) => (
		<ShapeBodyPolygon
			{...shape}
			points={buildManualInputPoints(
				-state.width / 2,
				-state.height / 2,
				state.width,
				state.height,
			)}
		/>
	),
);
