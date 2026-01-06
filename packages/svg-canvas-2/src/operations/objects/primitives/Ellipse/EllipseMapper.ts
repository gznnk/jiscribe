import { convertEllipseToFrame } from "@workspace/geometry";

import type { EllipseDoc } from "../../../../schemas/objects/primitives/EllipseDoc";
import type { EllipseState } from "../../../../states/objects/primitives/EllipseState";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../../types/ObjectMapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";

/**
 * Converts EllipseDoc to EllipseState.
 */
export const ellipseToState: DocToStateMapper<EllipseDoc, EllipseState> = (
	doc,
) => {
	const base = ObjectMapper.toState(doc);
	const frame = convertEllipseToFrame(doc);

	// TransformDoc to Transform conversion
	const rotation = doc.rotation ?? 0;
	const flipX = doc.flipX ?? false;
	const flipY = doc.flipY ?? false;
	const scaleX = flipX ? -1 : 1;
	const scaleY = flipY ? -1 : 1;

	return {
		...base,
		...frame,
		rotation,
		scaleX,
		scaleY,
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

	// Frame to Ellipse conversion
	const rx = state.width / 2;
	const ry = state.height / 2;

	// Transform to TransformDoc conversion
	const rotation = state.rotation !== 0 ? state.rotation : undefined;
	const flipX = state.scaleX < 0 ? true : undefined;
	const flipY = state.scaleY < 0 ? true : undefined;

	return {
		...base,
		cx: state.cx,
		cy: state.cy,
		rx,
		ry,
		rotation,
		flipX,
		flipY,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		fill: state.fill,
	} as EllipseDoc;
};
