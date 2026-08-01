import { addObject, type AddObjectParams } from "./addObject";
import {
	type AlignEdge,
	alignObjects,
	type DistributeAxis,
	distributeObjects,
} from "./arrangeObjects";
import { connect, type ConnectParams } from "./connect";
import { deleteObjects, type DeleteObjectsResult } from "./deleteObjects";
import { groupObjects, ungroupObject } from "./groupObjects";
import {
	moveObject,
	type MoveObjectParams,
	resizeObject,
	type ResizeObjectParams,
	translateObjects,
} from "./placeObjects";
import { setStyle, type SetStyleResult } from "./setStyle";
import { setText } from "./setText";
import type { StyleParams } from "./styleFields";
import { updateConnector, type UpdateConnectorParams } from "./updateConnector";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { DocDefinitionsConfig } from "../schemas/plugin/resolveDocDefinitions";
import { resolveDocDefinitions } from "../schemas/plugin/resolveDocDefinitions";

/**
 * Doc-ops instance driven by doc definitions. Built-in and plugin types alike are handled
 * uniformly, following the factory / features passed to `createDocOps`.
 *
 * Every op mutates `doc` in place and checks its arguments before it writes, so a call that
 * throws `DocOperationError` leaves the document exactly as it was.
 */
export type DocOps = {
	/**
	 * Add an object of `type`, mutating `doc` in place and returning the new id.
	 * Throws `DocOperationError` for a type this instance's definitions cannot create.
	 */
	addObject(doc: CanvasDoc, type: string, params: AddObjectParams): string;
	/**
	 * Join two objects with a connector, mutating `doc` in place and returning the new id.
	 * Throws `DocOperationError` when an endpoint is missing or not connectable.
	 */
	connect(doc: CanvasDoc, params: ConnectParams): string;
	/**
	 * Delete objects by id, cascading to a group's children and to connectors left dangling.
	 * Throws `DocOperationError` naming every id that was not found.
	 */
	deleteObjects(doc: CanvasDoc, ids: readonly string[]): DeleteObjectsResult;
	/**
	 * Move one object so its bounding box starts at the given top-left.
	 * Throws `DocOperationError` for a missing id or an object with no position of its own.
	 */
	moveObject(doc: CanvasDoc, id: string, params: MoveObjectParams): void;
	/**
	 * Shift several objects by the same delta, keeping the layout between them.
	 * Throws `DocOperationError` for a missing id or an object with no position of its own.
	 */
	translateObjects(
		doc: CanvasDoc,
		ids: readonly string[],
		deltaX: number,
		deltaY: number,
	): void;
	/**
	 * Resize one object around its bounding box's top-left corner.
	 * Throws `DocOperationError` for a missing id, an unsizable object, or a size ≤ 0.
	 */
	resizeObject(doc: CanvasDoc, id: string, params: ResizeObjectParams): void;
	/**
	 * Set styling on several objects, skipping and reporting what a type cannot hold.
	 * Throws `DocOperationError` naming every id that was not found.
	 */
	setStyle(
		doc: CanvasDoc,
		ids: readonly string[],
		style: StyleParams,
	): SetStyleResult;
	/**
	 * Rewrite one object's text: a shape's body, one named slot, or a connector's label.
	 * Throws `DocOperationError` for a missing id, a type holding no text, or an unknown slot.
	 */
	setText(doc: CanvasDoc, id: string, text: string, slot?: string): void;
	/**
	 * Re-attach, re-route, or re-label an existing connector.
	 * Throws `DocOperationError` when the id is not a connector or a new endpoint is illegal.
	 */
	updateConnector(
		doc: CanvasDoc,
		id: string,
		params: UpdateConnectorParams,
	): void;
	/**
	 * Line objects up on one edge of their combined bounding box.
	 * Throws `DocOperationError` for fewer than 2 ids or an object with no position.
	 */
	alignObjects(doc: CanvasDoc, ids: readonly string[], edge: AlignEdge): void;
	/**
	 * Spread objects along one axis with equal gaps, keeping the first one in place.
	 * Throws `DocOperationError` for too few ids (2 with `spacing`, 3 without).
	 */
	distributeObjects(
		doc: CanvasDoc,
		ids: readonly string[],
		axis: DistributeAxis,
		spacing?: number,
	): void;
	/**
	 * Wrap sibling objects in a new group and return its id.
	 * Throws `DocOperationError` for fewer than 2 ids, a connector, or members of different parents.
	 */
	groupObjects(doc: CanvasDoc, ids: readonly string[]): string;
	/**
	 * Dissolve a group, putting its children back in its place and returning their ids.
	 * Throws `DocOperationError` when the id is not a group, or names a rotated one.
	 */
	ungroupObject(doc: CanvasDoc, id: string): string[];
};

/**
 * Build a {@link DocOps}.
 *
 * @param config - Resolved by {@link resolveDocDefinitions}, whose preset/plugin merging and
 *   duplicate-type detection mirror createCanvasParser. Omit to handle only built-in definitions
 */
export const createDocOps = (config?: DocDefinitionsConfig): DocOps => {
	const definitions = resolveDocDefinitions(config, "createDocOps");
	return {
		addObject: (doc, type, params) => addObject(doc, type, params, definitions),
		connect: (doc, params) => connect(doc, params, definitions),
		deleteObjects: (doc, ids) => deleteObjects(doc, ids),
		moveObject: (doc, id, params) => moveObject(doc, id, params, definitions),
		translateObjects: (doc, ids, deltaX, deltaY) =>
			translateObjects(doc, ids, deltaX, deltaY, definitions),
		resizeObject: (doc, id, params) =>
			resizeObject(doc, id, params, definitions),
		setStyle: (doc, ids, style) => setStyle(doc, ids, style, definitions),
		setText: (doc, id, text, slot) => setText(doc, id, text, definitions, slot),
		updateConnector: (doc, id, params) =>
			updateConnector(doc, id, params, definitions),
		alignObjects: (doc, ids, edge) => alignObjects(doc, ids, edge, definitions),
		distributeObjects: (doc, ids, axis, spacing) =>
			distributeObjects(doc, ids, axis, spacing, definitions),
		groupObjects: (doc, ids) => groupObjects(doc, ids),
		ungroupObject: (doc, id) => ungroupObject(doc, id),
	};
};
