import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { OpenReferencePayload } from "../ObjectMenuTypes";

/**
 * Reads the `meta.reference` of the sole selected object, which is what the
 * "open reference" menu item acts on.
 *
 * `meta` is an open record, so the reference arrives untyped and is accepted
 * only as a non-empty string.
 *
 * @param canvasState - The current canvas controller state
 * @returns The payload to hand the host, or null when the selection is not a
 *   single object or that object carries no usable reference
 */
export const resolveOpenReference = (
	canvasState: CanvasControllerState,
): OpenReferencePayload | null => {
	const { selectedIds, objects } = canvasState;
	if (selectedIds.length !== 1) {
		return null;
	}

	const objectId = selectedIds[0];
	const reference = objects[objectId]?.meta?.reference;
	if (typeof reference !== "string" || reference === "") {
		return null;
	}
	return { objectId, reference };
};
