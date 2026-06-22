import { convertFrameToRect, convertRectToFrame } from "@workspace/geometry";

import type { SvgState } from "./SvgState";
import type { SvgDoc } from "../../../../schemas/objects/primitives/svg/SvgDoc";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../base/MapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "../../base/TransformMapper";

/**
 * Converts SvgDoc to SvgState.
 */
export const svgToState: DocToStateMapper<SvgDoc, SvgState> = (doc) => {
	const base = ObjectMapper.toState(doc);
	const frame = convertRectToFrame(doc);
	const transform = mapTransformDocToState(doc);

	return {
		...base,
		...frame,
		...transform,
		svgText: doc.svgText,
	} as SvgState;
};

/**
 * Converts SvgState to SvgDoc.
 */
export const svgToDoc: StateToDocMapper<SvgState, SvgDoc> = (state) => {
	const base = ObjectMapper.toDoc(state);
	const rect = convertFrameToRect(state);
	const transform = mapTransformStateToDoc(state);

	return {
		...base,
		...rect,
		...transform,
		svgText: state.svgText,
	} as SvgDoc;
};
