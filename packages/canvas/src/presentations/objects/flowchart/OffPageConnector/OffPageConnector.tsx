import { buildOffPageConnectorPoints } from "./buildOffPageConnectorPoints";
import { OffPageConnectorElement } from "./OffPageConnectorStyled";
import type { OffPageConnectorState } from "../../../../states/objects/flowchart/offPageConnector/OffPageConnectorState";
import { createFrameObject } from "../../base/createFrameObject";

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
