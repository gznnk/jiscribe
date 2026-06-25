import { convertFrameToRect, convertRectToFrame } from "@workspace/geometry";

import type { DiamondState } from "./DiamondState";
import type { DiamondDoc } from "../../../../schemas/objects/primitives/diamond/DiamondDoc";
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
 * Converts DiamondDoc to DiamondState.
 */
export const diamondToState: DocToStateMapper<DiamondDoc, DiamondState> = (
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
		strokeDashType: doc.strokeDashType,
		fill: doc.fill,
		text: doc.text,
		textType: doc.textType,
		textAlign: doc.textAlign,
		verticalAlign: doc.verticalAlign,
		fontColor: doc.fontColor,
		fontSize: doc.fontSize,
		fontFamily: doc.fontFamily,
		fontWeight: doc.fontWeight,
	} as DiamondState;
};

/**
 * Converts DiamondState to DiamondDoc.
 */
export const diamondToDoc: StateToDocMapper<DiamondState, DiamondDoc> = (
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
		strokeDashType: state.strokeDashType,
		fill: state.fill,
		text: state.text,
		textType: state.textType,
		textAlign: state.textAlign,
		verticalAlign: state.verticalAlign,
		fontColor: state.fontColor,
		fontSize: state.fontSize,
		fontFamily: state.fontFamily,
		fontWeight: state.fontWeight,
	} as DiamondDoc;
};
