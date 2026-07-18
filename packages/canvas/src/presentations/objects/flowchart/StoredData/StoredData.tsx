import { buildStoredDataPath } from "./buildStoredDataPath";
import { StoredDataElement } from "./StoredDataStyled";
import type { StoredDataState } from "../../../../states/objects/flowchart/storedData/StoredDataState";
import { createFrameObject } from "../../base/createFrameObject";

/** StoredData presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const StoredData = createFrameObject<StoredDataState>((state, shape) => (
	<StoredDataElement
		{...shape}
		d={buildStoredDataPath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
