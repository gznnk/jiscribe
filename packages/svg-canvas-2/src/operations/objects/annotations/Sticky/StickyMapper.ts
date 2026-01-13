import { convertFrameToRect, convertRectToFrame } from "@workspace/geometry";

import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../../../registry/ObjectRegistryTypes";
import type { StickyDoc } from "../../../../schemas/objects/annotations/StickyDoc";
import type { StickyState } from "../../../../states/objects/annotations/StickyState";
import { ObjectMapper } from "../../base/ObjectMapper";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "../../base/TransformMapper";

/**
 * Converts StickyDoc to StickyState.
 */
export const stickyToState: DocToStateMapper<StickyDoc, StickyState> = (
	doc,
) => {
	const base = ObjectMapper.toState(doc);
	const frame = convertRectToFrame(doc);
	const transform = mapTransformDocToState(doc);

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
	const transform = mapTransformStateToDoc(state);

	return {
		...base,
		...rect,
		...transform,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		fill: state.fill,
	} as StickyDoc;
};
