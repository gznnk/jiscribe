import { isBoolean } from "@jiscribe/basic-validators";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { DEFAULT_LOCK_ASPECT_RATIO } from "../../../states/objects/base/TransformState";
import type { StyleEntry } from "../StyleEntry";

/**
 * The flag as the objects that may carry one hold it. Absent from the shared
 * `ObjectState`, every type declaring `features.transform` carrying it instead
 * (TransformState), so it is read off the object rather than through its type.
 */
const lockOf = (object: ObjectState): unknown =>
	(object as unknown as { lockAspectRatio?: unknown }).lockAspectRatio;

/**
 * Whether a resize keeps the object's proportions, stored as `lockAspectRatio`
 * on the object itself.
 *
 * The selected objects alone, both ways: a member of a selected group keeps the
 * lock it was drawn with, since a drag on the group's handles reads the group's
 * own. The lock of a multi-selection is not an object's at all — it belongs to
 * the box drawn around the selection, which no entry can reach (see
 * StylePropertyRegistry).
 */
export const lockAspectRatioEntry: StyleEntry<ObjectState, boolean> = {
	apply: (object, _pick, locked, ctx) => {
		if (!ctx.selected) {
			return null;
		}
		return lockOf(object) === locked
			? object
			: ({ ...object, lockAspectRatio: locked } as ObjectState);
	},
	// A flag holding anything but a boolean reads as unset, the way a shape-style
	// field of the wrong type does (objectField) — and the resize gestures read it
	// the same way (dropAutoHeightOnResize).
	read: (object, _pick, ctx) => {
		if (!ctx.selected) {
			return [];
		}
		const locked = lockOf(object);
		return [isBoolean(locked) ? locked : DEFAULT_LOCK_ASPECT_RATIO];
	},
};
