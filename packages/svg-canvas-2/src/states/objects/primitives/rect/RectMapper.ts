import { convertFrameToRect, convertRectToFrame } from "@workspace/geometry";

import type { RectState } from "./RectState";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../../../registry/ObjectRegistryTypes";
import type { RectDoc } from "../../../../schemas/objects/primitives/RectDoc";
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
		text: doc.text,
		textType: doc.textType,
		textAlign: doc.textAlign,
		verticalAlign: doc.verticalAlign,
		fontColor: doc.fontColor,
		fontSize: doc.fontSize,
		fontFamily: doc.fontFamily,
		fontWeight: doc.fontWeight,
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
		text: state.text,
		textType: state.textType,
		textAlign: state.textAlign,
		verticalAlign: state.verticalAlign,
		fontColor: state.fontColor,
		fontSize: state.fontSize,
		fontFamily: state.fontFamily,
		fontWeight: state.fontWeight,
	} as RectDoc;
};
