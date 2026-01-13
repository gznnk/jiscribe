import { convertFrameToRect, convertRectToFrame } from "@workspace/geometry";

import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../../../registry/ObjectRegistryTypes";
import type { RectDoc } from "../../../../schemas/objects/primitives/RectDoc";
import type { RectState } from "../../../../states/objects/primitives/RectState";
import { ObjectMapper } from "../../base/ObjectMapper";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "../../base/TransformMapper";

/**
 * Converts RectDoc to RectState.
 */
export const rectToState: DocToStateMapper<RectDoc, RectState> = (doc) => {
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
	} as RectState;
};

/**
 * Converts RectState to RectDoc.
 */
export const rectToDoc: StateToDocMapper<RectState, RectDoc> = (state) => {
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
	} as RectDoc;
};
