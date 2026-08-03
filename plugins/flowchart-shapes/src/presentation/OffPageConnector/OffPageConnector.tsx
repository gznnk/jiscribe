import { createFrameObject } from "@workspace/canvas-sdk";

import { buildOffPageConnectorPoints } from "./buildOffPageConnectorPoints";
import { OffPageConnectorElement } from "./OffPageConnectorStyled";
import type { OffPageConnectorState } from "../../state/offPageConnector/OffPageConnectorState";

/** OffPageConnector presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const OffPageConnector = createFrameObject<OffPageConnectorState>(
	(state, shape) => (
		<OffPageConnectorElement
			{...shape}
			points={buildOffPageConnectorPoints(
				-state.width / 2,
				-state.height / 2,
				state.width,
				state.height,
			)}
		/>
	),
);
