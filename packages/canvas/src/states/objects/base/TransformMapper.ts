import type { TransformDoc } from "@jiscribe/doc/model/objects/base/TransformDoc";
import { roundDocRotation } from "@jiscribe/doc/model/roundDocNumbers";

import type { TransformState } from "../../../states/objects/base/TransformState";

/**
 * Maps TransformDoc to TransformState.
 * - rotation defaults to 0
 * - flipX/flipY convert to scaleX/scaleY (-1 for flipped, 1 for normal)
 * - lockAspectRatio is preserved
 *
 * @param doc - Transform properties in Doc format
 * @returns Transform properties in State format
 */
export function mapTransformDocToState(doc: TransformDoc): TransformState {
	const rotation = doc.rotation ?? 0;
	const flipX = doc.flipX ?? false;
	const flipY = doc.flipY ?? false;
	const scaleX = flipX ? -1 : 1;
	const scaleY = flipY ? -1 : 1;
	const lockAspectRatio = doc.lockAspectRatio;

	return {
		rotation,
		scaleX,
		scaleY,
		lockAspectRatio,
	};
}

/**
 * Maps TransformState to TransformDoc.
 * - rotation is rounded to the persisted precision, then omitted if that lands on 0
 * - scaleX/scaleY convert to flipX/flipY (true if negative, omitted if positive)
 * - lockAspectRatio is preserved
 *
 * @param state - Transform properties in State format
 * @returns Transform properties in Doc format
 */
export function mapTransformStateToDoc(state: TransformState): TransformDoc {
	// Rounded before the 0 test so an angle that is only float noise away from
	// upright is dropped rather than persisted (roundDocNumbers).
	const roundedRotation = roundDocRotation(state.rotation);
	const rotation = roundedRotation !== 0 ? roundedRotation : undefined;
	const flipX = state.scaleX < 0 ? true : undefined;
	const flipY = state.scaleY < 0 ? true : undefined;
	const lockAspectRatio = state.lockAspectRatio;

	return {
		rotation,
		flipX,
		flipY,
		lockAspectRatio,
	};
}
