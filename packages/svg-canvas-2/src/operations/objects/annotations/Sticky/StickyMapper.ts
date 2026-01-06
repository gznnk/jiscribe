import { convertRectToFrame } from "@workspace/geometry";

import type { StickyDoc } from "../../../../schemas/objects/annotations/StickyDoc";
import type { StickyState } from "../../../../states/objects/annotations/StickyState";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../../types/ObjectMapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";

/**
 * Converts StickyDoc to StickyState.
 */
export const stickyToState: DocToStateMapper<StickyDoc, StickyState> = (
	doc,
) => {
	const base = ObjectMapper.toState(doc);
	const frame = convertRectToFrame(doc);

	// TransformDoc to Transform conversion
	const rotation = doc.rotation ?? 0;
	const flipX = doc.flipX ?? false;
	const flipY = doc.flipY ?? false;
	const scaleX = flipX ? -1 : 1;
	const scaleY = flipY ? -1 : 1;

	return {
		...base,
		...frame,
		rotation,
		scaleX,
		scaleY,
		stroke: doc.stroke,
		strokeWidth: doc.strokeWidth,
		fill: doc.fill,
	} as StickyState;
};

/**
 * Converts StickyState to StickyDoc.
 */
export const stickyToDoc: StateToDocMapper<StickyState, StickyDoc> = (
	state,
) => {
	const base = ObjectMapper.toDoc(state);

	// Frame to Rect conversion
	const x = state.cx - state.width / 2;
	const y = state.cy - state.height / 2;

	// Transform to TransformDoc conversion
	const rotation = state.rotation !== 0 ? state.rotation : undefined;
	const flipX = state.scaleX < 0 ? true : undefined;
	const flipY = state.scaleY < 0 ? true : undefined;

	return {
		...base,
		x,
		y,
		width: state.width,
		height: state.height,
		rotation,
		flipX,
		flipY,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		fill: state.fill,
	} as StickyDoc;
};
