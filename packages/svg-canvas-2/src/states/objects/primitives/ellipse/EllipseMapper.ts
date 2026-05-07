import {
	convertEllipseToFrame,
	convertFrameToEllipse,
} from "@workspace/geometry";

import type { EllipseState } from "./EllipseState";
import type { EllipseDoc } from "../../../../schemas/objects/primitives/EllipseDoc";
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
 * Converts EllipseDoc to EllipseState.
 */
export const ellipseToState: DocToStateMapper<EllipseDoc, EllipseState> = (
	doc,
) => {
	const base = ObjectMapper.toState(doc);
	const frame = convertEllipseToFrame(doc);
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
	} as EllipseState;
};

/**
 * Converts EllipseState to EllipseDoc.
 */
export const ellipseToDoc: StateToDocMapper<EllipseState, EllipseDoc> = (
	state,
) => {
	const base = ObjectMapper.toDoc(state);
	const ellipse = convertFrameToEllipse(state);
	const transform = mapTransformStateToDoc(state);

	return {
		...base,
		...ellipse,
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
	} as EllipseDoc;
};
