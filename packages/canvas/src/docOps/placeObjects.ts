import { DocOperationError } from "./errors";
import { requireObject, requireObjects } from "./objectAccess";
import {
	type DocDefinitions,
	requireObjectBounds,
	scaleObject,
	translateObject,
} from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";

/** Position an object is moved to, as the top-left of its bounding box. */
export type MoveObjectParams = {
	/** New left edge in px; omitted keeps the current one. */
	x?: number;
	/** New top edge in px; omitted keeps the current one. */
	y?: number;
};

/**
 * Move one object so its bounding box starts at the given position, mutating `doc` in place.
 *
 * A group moves with its children, and connectors attached to the object follow it because
 * their endpoints are resolved from the objects they own, not stored as coordinates.
 *
 * @param doc - Mutated in place
 * @param id - Id of the object to move; must exist in the root tree
 * @param params - Target top-left; an omitted axis is left where it is
 * @param definitions - Type table `features.geometry` is read from
 * @throws {@link DocOperationError} when the id is missing, or names a connector or another
 *   object with no position of its own
 */
export const moveObject = (
	doc: CanvasDoc,
	id: string,
	params: MoveObjectParams,
	definitions: DocDefinitions,
): void => {
	const { object } = requireObject(doc, id);
	const bounds = requireObjectBounds(object, definitions);
	translateObject(
		object,
		(params.x ?? bounds.x) - bounds.x,
		(params.y ?? bounds.y) - bounds.y,
		definitions,
	);
};

/**
 * Shift several objects by the same delta, mutating `doc` in place. The way to move a
 * cluster without disturbing its internal layout.
 *
 * @param doc - Mutated in place
 * @param ids - Ids to shift; all must exist, and none may be a connector
 * @param deltaX - Px to add to every x coordinate; positive moves right
 * @param deltaY - Px to add to every y coordinate; positive moves down
 * @param definitions - Type table `features.geometry` is read from
 * @throws {@link DocOperationError} before touching the doc when any id is missing or
 *   cannot be positioned, so a rejected call leaves the doc untouched
 */
export const translateObjects = (
	doc: CanvasDoc,
	ids: readonly string[],
	deltaX: number,
	deltaY: number,
	definitions: DocDefinitions,
): void => {
	const locations = requireObjects(doc, ids);
	// Measure every object first: a mid-way failure would leave half the cluster moved.
	locations.forEach(({ object }) => requireObjectBounds(object, definitions));
	for (const { object } of locations) {
		translateObject(object, deltaX, deltaY, definitions);
	}
};

/** New size for an object, keeping its bounding box's top-left corner. */
export type ResizeObjectParams = {
	/** New bounding-box width in px; omitted keeps the current width. */
	width?: number;
	/** New bounding-box height in px; omitted keeps the current height. */
	height?: number;
};

/**
 * Resize one object around its top-left corner, mutating `doc` in place.
 *
 * Geometry alone is scaled: stroke width and font size are styling and are left as they
 * are. A group scales its children, so their gaps scale with the box.
 *
 * @param doc - Mutated in place
 * @param id - Id of the object to resize; must exist in the root tree
 * @param params - Target size; an omitted axis keeps its current extent. Both must be
 *   greater than 0
 * @param definitions - Type table `features.geometry` is read from
 * @throws {@link DocOperationError} when the id is missing, names a connector or another
 *   object with no size of its own, has a zero extent on an axis being resized, or when a
 *   requested extent is not greater than 0
 */
export const resizeObject = (
	doc: CanvasDoc,
	id: string,
	params: ResizeObjectParams,
	definitions: DocDefinitions,
): void => {
	const { object } = requireObject(doc, id);
	const bounds = requireObjectBounds(object, definitions);
	const width = params.width ?? bounds.width;
	const height = params.height ?? bounds.height;
	if (width <= 0 || height <= 0) {
		throw new DocOperationError(
			`${id} cannot be resized to ${width}x${height}: both sides must be greater than 0`,
		);
	}
	if (
		(bounds.width === 0 && width !== 0) ||
		(bounds.height === 0 && height !== 0)
	) {
		throw new DocOperationError(
			`${id} has a zero-width or zero-height bounding box, so it cannot be scaled to a size`,
		);
	}
	scaleObject(
		object,
		{ x: bounds.x, y: bounds.y },
		width / bounds.width,
		height / bounds.height,
		definitions,
	);
};
