import { buildCalloutPath } from "./buildCalloutPath";
import { CalloutElement } from "./CalloutStyled";
import type { CalloutState } from "../../../../states/objects/annotations/callout/CalloutState";
import { createFrameObject } from "../../base/createFrameObject";

/** Callout presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Callout = createFrameObject<CalloutState>((state, shape) => (
	<CalloutElement
		{...shape}
		d={buildCalloutPath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
