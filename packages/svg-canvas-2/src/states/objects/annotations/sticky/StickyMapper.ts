import { convertFrameToRect, convertRectToFrame } from "@workspace/geometry";

import type { StickyState } from "./StickyState";
import type { StickyDoc } from "../../../../schemas/objects/annotations/StickyDoc";
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
		fill: doc.fill,
		text: doc.text,
		textType: doc.textType,
		textAlign: doc.textAlign,
		verticalAlign: doc.verticalAlign,
		fontColor: doc.fontColor,
		fontSize: doc.fontSize,
		fontFamily: doc.fontFamily,
		fontWeight: doc.fontWeight,
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
		fill: state.fill,
		text: state.text,
		textType: state.textType,
		textAlign: state.textAlign,
		verticalAlign: state.verticalAlign,
		fontColor: state.fontColor,
		fontSize: state.fontSize,
		fontFamily: state.fontFamily,
		fontWeight: state.fontWeight,
	} as StickyDoc;
};
