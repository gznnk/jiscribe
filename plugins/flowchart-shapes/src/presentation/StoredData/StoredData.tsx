import { ShapeBodyPath, createFrameObject } from "@jiscribe/canvas-sdk";

import { buildStoredDataPath } from "./buildStoredDataPath";
import type { StoredDataState } from "../../state/storedData/StoredDataState";

/** StoredData presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const StoredData = createFrameObject<StoredDataState>((state, shape) => (
	<ShapeBodyPath
		{...shape}
		d={buildStoredDataPath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
