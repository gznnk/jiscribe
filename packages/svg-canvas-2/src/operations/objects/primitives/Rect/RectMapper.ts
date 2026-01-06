import { convertFrameToRect, convertRectToFrame } from "@workspace/geometry";

import type { RectDoc } from "../../../../schemas/objects/primitives/RectDoc";
import type { RectState } from "../../../../states/objects/primitives/RectState";
import { ObjectMapper } from "../../base/ObjectMapper";
import type { DocToStateMapper, StateToDocMapper } from "../../types/ObjectMapperTypes";
import {
	convertTransformDocToState,
	convertTransformStateToDoc,
} from "../../utils/transformConverter";

/**
 * Converts RectDoc to RectState.
 */
export const rectToState: DocToStateMapper<RectDoc, RectState> = (doc) => {
	const base = ObjectMapper.toState(doc);
	const frame = convertRectToFrame(doc);
	const transform = convertTransformDocToState(doc);

	return {
		...base,
		...frame,
		...transform,
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
	const transform = convertTransformStateToDoc(state);

	return {
		...base,
		...rect,
		...transform,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		fill: state.fill,
	} as RectDoc;
};
