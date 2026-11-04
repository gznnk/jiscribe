import type { Rect } from "@jiscribe/geometry";

import { DocOperationError } from "./errors";
import { batchItemError } from "./utils/batchErrors";
import { isBlockLayoutText } from "./utils/extraFields";
import { requireFiniteNumber } from "./utils/numberArgs";
import {
	findRepeatedIds,
	type ObjectRecord,
	readChildren,
	rejectIds,
	requireObject,
	requireObjects,
} from "./utils/objectAccess";
import {
	type DocDefinitions,
	requireObjectBounds,
	requireResizableObject,
	scaleObject,
	translateObject,
} from "./utils/objectGeometry";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import { supportsAutoHeight } from "../plugin/supportsAutoHeight";

/** Position an object is moved to, as the top-left of its bounding box. */
export type SetPositionParams = {
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
export const setPosition = (
	doc: CanvasDoc,
	id: string,
	params: SetPositionParams,
	definitions: DocDefinitions,
): void => {
	if (params.x !== undefined) {
		requireFiniteNumber(params.x, "x");
	}
	if (params.y !== undefined) {
		requireFiniteNumber(params.y, "y");
	}
	const { object } = requireObject(doc, id);
	const bounds = requireObjectBounds(object, definitions);
	translateObject(
		object,
		(params.x ?? bounds.x) - bounds.x,
		(params.y ?? bounds.y) - bounds.y,
		definitions,
	);
};

/** One object's new position in a {@link setPositions} call. */
export type SetPositionEntry = { id: string } & SetPositionParams;

/**
 * Move several objects to positions of their own, mutating `doc` in place.
 *
 * Each entry carries an absolute top-left, so this is the op for laying objects out at
 * computed coordinates; to shift a cluster while keeping its internal layout, give one delta
 * to {@link translateObjects} instead.
 *
 * @param doc - Mutated in place
 * @param entries - Target top-left per object, applied in the order given; an omitted axis
 *   leaves that object where it is, and a repeated id ends up where its last entry says
 * @param definitions - Type table `features.geometry` is read from
 * @throws {@link DocOperationError} before touching the doc: for a missing id, naming every
 *   missing one at once; for an id with no position of its own, identified as `entries[i] (id)`
 */
export const setPositions = (
	doc: CanvasDoc,
	entries: readonly SetPositionEntry[],
	definitions: DocDefinitions,
): void => {
	const locations = requireObjects(
		doc,
		entries.map(({ id }) => id),
	);
	// Measure every object first: a mid-way failure would leave half the batch moved.
	locations.forEach(({ object }, index) => {
		try {
			requireObjectBounds(object, definitions);
		} catch (error) {
			throw batchItemError("entries", index, object.id, error);
		}
	});
	locations.forEach(({ object }, index) => {
		// Measured again per entry, so a second entry for the same object reads where the
		// first one put it rather than a stale box.
		const bounds = requireObjectBounds(object, definitions);
		translateObject(
			object,
			(entries[index].x ?? bounds.x) - bounds.x,
			(entries[index].y ?? bounds.y) - bounds.y,
			definitions,
		);
	});
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
	requireFiniteNumber(deltaX, "deltaX");
	requireFiniteNumber(deltaY, "deltaY");
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
 * An object cleared for resizing: one scaled from its box to the target extents, or a
 * block text (isBlockLayoutText), which has only the width it wraps in rewritten.
 */
type ResizePlan =
	| {
			kind: "scale";
			object: ObjectRecord;
			bounds: Rect;
			width: number;
			height: number;
	  }
	| { kind: "blockWidth"; object: ObjectRecord; width: number | undefined };

/**
 * Settle the new wrap width of a block text (isBlockLayoutText), writing nothing. Its
 * height is measured from its content, so a height asked for is refused rather than
 * dropped.
 */
const planBlockTextResize = (
	object: ObjectRecord,
	params: ResizeObjectParams,
): ResizePlan => {
	if (params.height !== undefined) {
		throw new DocOperationError(
			`${object.id} ("${object.type}") has no height of its own to set: its height is measured from its content, so resize it by width alone`,
		);
	}
	if (params.width === undefined) {
		return { kind: "blockWidth", object, width: undefined };
	}
	const width = requireFiniteNumber(params.width, "width");
	if (width <= 0) {
		throw new DocOperationError(
			`${object.id} cannot be resized to width ${width}: it must be greater than 0`,
		);
	}
	return { kind: "blockWidth", object, width };
};

/** Settle one object's target size and reject what cannot be scaled, writing nothing. */
const planResize = (
	object: ObjectRecord,
	params: ResizeObjectParams,
	definitions: DocDefinitions,
): ResizePlan => {
	const definition = definitions.get(object.type);
	if (
		definition?.features.geometry === "point" &&
		isBlockLayoutText(definition, object.textLayout)
	) {
		return planBlockTextResize(object, params);
	}
	requireResizableObject(object, definitions);
	const bounds = requireObjectBounds(object, definitions);
	const width = params.width ?? bounds.width;
	const height = params.height ?? bounds.height;
	// Before the comparison below: NaN fails every comparison, so it would read as a
	// size greater than 0 and be written as the object's extent
	requireFiniteNumber(width, "width");
	requireFiniteNumber(height, "height");
	if (width <= 0 || height <= 0) {
		throw new DocOperationError(
			`${object.id} cannot be resized to ${width}x${height}: both sides must be greater than 0`,
		);
	}
	if (
		(bounds.width === 0 && width !== 0) ||
		(bounds.height === 0 && height !== 0)
	) {
		throw new DocOperationError(
			`${object.id} has a zero-width or zero-height bounding box, so it cannot be scaled to a size`,
		);
	}
	return { kind: "scale", object, bounds, width, height };
};

/**
 * Carry out a plan {@link planResize} has already cleared. A block text's plan keeps the
 * stored corner, which for a point-geometry doc is the drawn top-left.
 */
const applyResize = (plan: ResizePlan, definitions: DocDefinitions): void => {
	if (plan.kind === "blockWidth") {
		if (plan.width !== undefined) {
			plan.object.width = plan.width;
		}
		return;
	}
	const { object, bounds, width, height } = plan;
	scaleObject(
		object,
		{ x: bounds.x, y: bounds.y },
		width / bounds.width,
		height / bounds.height,
		definitions,
	);
};

/**
 * Resize one object around its top-left corner, mutating `doc` in place.
 *
 * Geometry alone is scaled: stroke width and font size are styling and are left as they
 * are. A group scales its children, so their gaps scale with the box. A block text
 * (isBlockLayoutText) has the width it wraps in rewritten and nothing else, its height
 * following its content.
 *
 * @param doc - Mutated in place
 * @param id - Id of the object to resize; must exist in the root tree
 * @param params - Target size; an omitted axis keeps its current extent. Both must be
 *   greater than 0
 * @param definitions - Type table `features.geometry` is read from
 * @throws {@link DocOperationError} when the id is missing, names a connector or another
 *   object with no size of its own to set — a `geometry: "point"` shape measured from its
 *   content — has a zero extent on an axis being resized, or when a requested extent is
 *   not greater than 0; for a block text, when a height is given
 */
export const resizeObject = (
	doc: CanvasDoc,
	id: string,
	params: ResizeObjectParams,
	definitions: DocDefinitions,
): void => {
	const { object } = requireObject(doc, id);
	applyResize(planResize(object, params, definitions), definitions);
};

/** Ids of every object a group holds, at any depth; empty for any other object. */
const collectDescendantIds = (object: ObjectRecord): string[] =>
	readChildren(object).flatMap((child) => [
		child.id,
		...collectDescendantIds(child),
	]);

/**
 * Refuse a batch naming a group together with an object inside it: the group's scale
 * already moves and scales the member, so a size of the member's own would be applied to a
 * box it no longer has.
 */
const rejectNestedResizeTargets = (objects: readonly ObjectRecord[]): void => {
	const targetIds = new Set(objects.map(({ id }) => id));
	const nestedPairs = objects.flatMap((group) =>
		collectDescendantIds(group)
			.filter((memberId) => targetIds.has(memberId))
			.map((memberId) => `${memberId} (inside ${group.id})`),
	);
	if (nestedPairs.length > 0) {
		throw new DocOperationError(
			`${nestedPairs.join(", ")}: given together with a group holding it; resize the group or what it holds, not both`,
		);
	}
};

/** One object's new size in a {@link resizeObjects} call. */
export type ResizeObjectEntry = { id: string } & ResizeObjectParams;

/**
 * Resize several objects to sizes of their own, each around its own top-left corner,
 * mutating `doc` in place.
 *
 * Every entry is planned against the document as it stood before the call, then all are
 * applied. A group and an object inside it (at any depth) cannot be named in the same call,
 * since scaling the group already moves and scales what it holds.
 *
 * @param doc - Mutated in place
 * @param entries - Target size per object, applied in the order given; an omitted axis
 *   keeps that object's current extent, and an entry naming neither axis leaves the object
 *   as it is. An id may appear only once. Each extent given must be greater than 0
 * @param definitions - Type table `features.geometry` is read from
 * @throws {@link DocOperationError} before touching the doc: naming every repeated id; for
 *   a missing id, naming every missing one at once; naming every object given together with
 *   a group holding it, and that group; for a size failure — a connector or
 *   other object with no size of its own to set, a zero extent on an axis being resized, a
 *   requested extent not greater than 0, a height for a block text — identified as
 *   `entries[i] (id)`. One such entry rejects the whole batch
 */
export const resizeObjects = (
	doc: CanvasDoc,
	entries: readonly ResizeObjectEntry[],
	definitions: DocDefinitions,
): void => {
	// A repeated id would be scaled twice, the second time off the box it no longer has.
	rejectIds(
		findRepeatedIds(entries.map(({ id }) => id)),
		"given more than once; put both axes of one object in a single entry",
	);
	const locations = requireObjects(
		doc,
		entries.map(({ id }) => id),
	);
	rejectNestedResizeTargets(locations.map(({ object }) => object));
	// Plan every object first: a mid-way failure would leave half the batch resized.
	const plans = locations.map(({ object }, index) => {
		try {
			return planResize(object, entries[index], definitions);
		} catch (error) {
			throw batchItemError("entries", index, object.id, error);
		}
	});
	for (const plan of plans) {
		applyResize(plan, definitions);
	}
};

/** Which way {@link setHeightMode} switches one shape's height. */
export type SetHeightModeParams =
	| {
			/** The height follows the text: it is dropped from the document. */
			mode: "auto";
	  }
	| {
			/** The height is the document's again, at the value given here. */
			mode: "fixed";
			/** Height in px to write; must be greater than 0. */
			height: number;
	  };

/** Reject a shape whose type has no height to switch, writing nothing. */
const requireAutoHeightType = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): void => {
	const definition = definitions.get(object.type);
	if (definition === undefined) {
		throw new DocOperationError(
			`${object.id} has unknown object type "${object.type}", so its height mode cannot be changed`,
		);
	}
	if (!supportsAutoHeight(definition)) {
		throw new DocOperationError(
			`${object.id} ("${object.type}") does not support a text-derived height; only box shapes holding one body of text inside their box, and not opted out of it, do`,
		);
	}
};

/**
 * Switch several objects between a height the document states and one that
 * follows their text, mutating `doc` in place.
 *
 * `"auto"` deletes the `height` field, which is how the format spells "size this
 * from the text" — the height is then derived on every read
 * (`calcAutoShapeHeight`) rather than stored. `"fixed"` writes the height given
 * back, which is the value the caller has just derived or the one a drag has just
 * settled on; the mode is one property of the document either way, so the two
 * directions are one op.
 *
 * Only a type whose box holds its text can be switched (`supportsAutoHeight`) —
 * a shape labelled outside its outline, one whose bands size themselves, and one
 * storing no height have nothing to derive from — and naming another is an error
 * rather than a skip, since the caller asked for a mode the shape cannot be in.
 *
 * @param doc - Mutated in place
 * @param ids - Ids to switch; all must exist in the root tree, and repeats are harmless (the second pass writes what the first did)
 * @param params - The mode shared by every id, with the height to write when it is `"fixed"`
 * @param definitions - Type table `features` and `textRegion` are read from
 * @throws {@link DocOperationError} before touching the doc: for a missing id, naming every
 *   missing one at once; for a `"fixed"` height not greater than 0; and for a type that
 *   cannot size itself from its text, identified as `ids[i] (id)`
 */
export const setHeightMode = (
	doc: CanvasDoc,
	ids: readonly string[],
	params: SetHeightModeParams,
	definitions: DocDefinitions,
): void => {
	if (params.mode === "fixed" && !(params.height > 0)) {
		throw new DocOperationError(
			`${params.height} is not a height: a fixed height must be greater than 0`,
		);
	}
	const locations = requireObjects(doc, ids);
	// Check every type first: a mid-way failure would leave half the batch switched.
	locations.forEach(({ object }, index) => {
		try {
			requireAutoHeightType(object, definitions);
		} catch (error) {
			throw batchItemError("ids", index, object.id, error);
		}
	});
	for (const { object } of locations) {
		if (params.mode === "auto") {
			delete object.height;
		} else {
			object.height = params.height;
		}
	}
};
