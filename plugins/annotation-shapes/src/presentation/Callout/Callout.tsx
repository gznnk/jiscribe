import { createFrameObject } from "@workspace/canvas/unstable";

import { buildCalloutPath } from "./buildCalloutPath";
import { CalloutElement } from "./CalloutStyled";
import { resolveCalloutTail } from "./calloutTailGeometry";
import type { CalloutState } from "../../state/callout/CalloutState";

/** Callout presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Callout = createFrameObject<CalloutState>((state, shape) => (
	<CalloutElement
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
