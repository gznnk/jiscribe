import { convertFrameToRect, convertRectToFrame } from "@workspace/geometry";

import type { StickyDoc } from "../../../../schemas/objects/annotations/StickyDoc";
import type { StickyState } from "../../../../states/objects/annotations/StickyState";
import { ObjectMapper } from "../../base/ObjectMapper";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../types/ObjectMapperTypes";
import {
	convertTransformDocToState,
	convertTransformStateToDoc,
} from "../../utils/transformConverter";

/**
 * Converts StickyDoc to StickyState.
 */
export const stickyToState: DocToStateMapper<StickyDoc, StickyState> = (
	doc,
) => {
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
	} as StickyState;
};

/**
 * Converts StickyState to StickyDoc.
 */
export const stickyToDoc: StateToDocMapper<StickyState, StickyDoc> = (
	state,
) => {
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
	} as StickyDoc;
};
