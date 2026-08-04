import { createFrameObject, ShapeBodyPath } from "@workspace/canvas-sdk";

import { buildCalloutPath } from "./buildCalloutPath";
import { resolveCalloutTail } from "./calloutTailGeometry";
import type { CalloutState } from "../../state/callout/CalloutState";

/** Callout presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Callout = createFrameObject<CalloutState>((state, shape) => (
	<ShapeBodyPath
		{...shape}
		d={buildCalloutPath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
			resolveCalloutTail(state),
		)}
	/>
));
