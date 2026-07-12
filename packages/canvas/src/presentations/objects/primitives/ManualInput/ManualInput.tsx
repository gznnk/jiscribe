import { buildManualInputPoints } from "./buildManualInputPoints";
import { ManualInputElement } from "./ManualInputStyled";
import type { ManualInputState } from "../../../../states/objects/primitives/manualInput/ManualInputState";
import { createFrameObject } from "../../base/createFrameObject";

/** ManualInput presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const ManualInput = createFrameObject<ManualInputState>(
	(state, shape) => (
		<ManualInputElement
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
