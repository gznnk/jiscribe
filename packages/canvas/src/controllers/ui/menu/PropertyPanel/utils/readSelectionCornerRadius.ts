import { isNumber } from "@jiscribe/basic-validators";

import { readSelectionValue } from "./readSelectionValue";
import type { SelectionValue } from "./SelectionValue";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/** An omitted `rx` draws square corners, the SVG attribute's own default. */
export const DEFAULT_CORNER_RADIUS = 0;

/**
 * What the whole selection says about how far its corners are rounded.
 *
 * Who has a say is decided by `features.radius` rather than by `rx` being
 * present: a document that rounded nothing yields a state without the key, and
 * such a shape still draws square corners — a value that disagrees with a
 * rounded one.
 *
 * @param selectedIds - The selection; a selected group contributes its descendants too
 * @param objects - Every object of the canvas, keyed by id
 * @returns The radius in pixels; `none` when nothing in the selection has corners to round
 */
export const readSelectionCornerRadius = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
): SelectionValue<number> =>
	readSelectionValue(selectedIds, objects, (object) => {
		if (!object.features?.radius) {
			return undefined;
		}
		const cornerRadius = (object as Record<string, unknown>).rx;
		return isNumber(cornerRadius) ? cornerRadius : DEFAULT_CORNER_RADIUS;
	});
