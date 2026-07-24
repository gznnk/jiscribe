import { createFrameObject } from "@workspace/canvas/unstable";

import { buildExtractPoints } from "./buildExtractPoints";
import { ExtractElement } from "./ExtractStyled";
import type { ExtractState } from "../../state/extract/ExtractState";

/** Extract presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Extract = createFrameObject<ExtractState>((state, shape) => (
	<ExtractElement
		{...shape}
		points={buildExtractPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
