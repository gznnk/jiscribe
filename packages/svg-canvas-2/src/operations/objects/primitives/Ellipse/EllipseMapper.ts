import {
	convertEllipseToFrame,
	convertFrameToEllipse,
} from "@workspace/geometry";

import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../../../registry/ObjectRegistryTypes";
import type { EllipseDoc } from "../../../../schemas/objects/primitives/EllipseDoc";
import type { EllipseState } from "../../../../states/objects/primitives/EllipseState";
import { ObjectMapper } from "../../base/ObjectMapper";
import {
	convertTransformDocToState,
	convertTransformStateToDoc,
} from "../../utils/transformConverter";

/**
 * Converts EllipseDoc to EllipseState.
 */
export const ellipseToState: DocToStateMapper<EllipseDoc, EllipseState> = (
	doc,
) => {
	const base = ObjectMapper.toState(doc);
	const frame = convertEllipseToFrame(doc);
	const transform = convertTransformDocToState(doc);

	return {
		...base,
		...frame,
		...transform,
		stroke: doc.stroke,
		strokeWidth: doc.strokeWidth,
		fill: doc.fill,
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
	const transform = convertTransformStateToDoc(state);

	return {
		...base,
		...ellipse,
		...transform,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		fill: state.fill,
	} as EllipseDoc;
};
