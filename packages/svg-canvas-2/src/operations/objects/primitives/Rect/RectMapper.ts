import { convertFrameToRect, convertRectToFrame } from "@workspace/geometry";

import type { RectDoc } from "../../../../schemas/objects/primitives/RectDoc";
import type { RectState } from "../../../../states/objects/primitives/RectState";
import type { DocToStateMapper, StateToDocMapper } from "../../../types/ObjectMapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";

/**
 * Converts RectDoc to RectState.
 */
export const rectToState: DocToStateMapper<RectDoc, RectState> = (doc) => {
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
	} as RectState;
};

/**
 * Converts RectState to RectDoc.
 */
export const rectToDoc: StateToDocMapper<RectState, RectDoc> = (state) => {
	const base = ObjectMapper.toDoc(state);
	const rect = convertFrameToRect(state);

	// Transform to TransformDoc conversion
	const rotation = state.rotation !== 0 ? state.rotation : undefined;
	const flipX = state.scaleX < 0 ? true : undefined;
	const flipY = state.scaleY < 0 ? true : undefined;

	return {
		...base,
		...rect,
		rotation,
		flipX,
		flipY,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		fill: state.fill,
	} as RectDoc;
};
