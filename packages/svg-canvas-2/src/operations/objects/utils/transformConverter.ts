import type { Transform } from "@workspace/geometry";

import type { TransformDoc } from "../../../schemas/objects/base/TransformDoc";

/**
 * Converts TransformDoc to Transform.
 * - rotation defaults to 0
 * - flipX/flipY convert to scaleX/scaleY (-1 for flipped, 1 for normal)
 *
 * @param doc - Transform properties in Doc format
 * @returns Transform properties in State format
 */
export function convertTransformDocToState(doc: TransformDoc): Transform {
	const rotation = doc.rotation ?? 0;
	const flipX = doc.flipX ?? false;
	const flipY = doc.flipY ?? false;
	const scaleX = flipX ? -1 : 1;
	const scaleY = flipY ? -1 : 1;

	return {
		rotation,
		scaleX,
		scaleY,
	};
}

/**
 * Converts Transform to TransformDoc.
 * - rotation is omitted if 0
 * - scaleX/scaleY convert to flipX/flipY (true if negative, omitted if positive)
 *
 * @param state - Transform properties in State format
 * @returns Transform properties in Doc format
 */
export function convertTransformStateToDoc(state: Transform): TransformDoc {
	const rotation = state.rotation !== 0 ? state.rotation : undefined;
	const flipX = state.scaleX < 0 ? true : undefined;
	const flipY = state.scaleY < 0 ? true : undefined;

	return {
		rotation,
		flipX,
		flipY,
	};
}
