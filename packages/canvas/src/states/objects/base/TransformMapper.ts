import type { TransformDoc } from "../../../schemas/objects/base/TransformDoc";
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
 * - rotation is omitted if 0
 * - scaleX/scaleY convert to flipX/flipY (true if negative, omitted if positive)
 * - lockAspectRatio is preserved
 *
 * @param state - Transform properties in State format
 * @returns Transform properties in Doc format
 */
export function mapTransformStateToDoc(state: TransformState): TransformDoc {
	const rotation = state.rotation !== 0 ? state.rotation : undefined;
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
