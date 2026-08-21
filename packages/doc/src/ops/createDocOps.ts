import type { Point, Rect } from "@jiscribe/geometry";

import {
	type AlignEdge,
	alignObjects,
	type DistributeAxis,
	distributeObjects,
} from "./arrange";
import { getCombinedBounds, getObjectBounds } from "./bounds";
import {
	connect,
	connectMany,
	type ConnectParams,
	getConnectedObjects,
	getConnectors,
	updateConnector,
	type UpdateConnectorEntry,
	updateConnectors,
	type UpdateConnectorParams,
} from "./connectors";
import {
	addObject,
	type AddObjectEntry,
	type AddObjectParams,
	addObjects,
} from "./create";
import { deleteObjects, type DeleteObjectsResult } from "./delete";
import { setExtraProps } from "./extraProps";
import {
	addObjectsToGroup,
	getGroupMembers,
	getParentGroup,
	groupObjects,
	dissolveGroup,
	dissolveGroups,
	removeObjectsFromGroup,
	type RemoveObjectsFromGroupResult,
} from "./grouping";
import {
	type GetZOrderResult,
	getZOrder,
	reorderObjects,
	type ZOrderPlacement,
} from "./order";
import {
	resizeObject,
	resizeObjects,
	type ResizeObjectParams,
	setPosition,
	type SetPositionEntry,
	type SetPositionParams,
	setPositions,
	translateObjects,
} from "./place";
import {
	findObjects,
	getObject,
	listObjects,
	type ObjectFilter,
	type ObjectSummary,
} from "./query";
import {
	setPoints,
	type SetPointsEntry,
	setPointsMany,
	setRotation,
	type SetRotationResult,
} from "./reshape";
import { setStyle, type SetStyleResult } from "./style";
import {
	getText,
	setText,
	type SetTextEntry,
	setTexts,
	setInlineTextStyle,
	type SetInlineTextStyleEntry,
	setInlineTextStyles,
	type InlineTextStyleParams,
} from "./text";
import { listTypes, type ObjectTypeSummary } from "./types";
import type { StyleParams } from "./utils/styleFields";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../model/objects/base/ObjectDoc";
import type { DocDefinitionsConfig } from "../plugin/resolveDocDefinitions";
import { resolveDocDefinitions } from "../plugin/resolveDocDefinitions";

/**
 * The whole set of programmatic edits to a CanvasDoc: building it up (`addObject` /
 * `connect`) and reworking what is already there (delete / move / resize / rotate / reshape /
 * restack / style / retext / re-route / align / group), plus reading back what is there.
 * Built-in and plugin types alike are handled uniformly, following the factory / features
 * passed to `createDocOps`.
 *
 * Every editing op mutates `doc` in place and checks its arguments before it writes, so a
 * call that throws `DocOperationError` leaves the document exactly as it was.
 *
 * Most ops come in a single and a batch form. The batch form is not a loop the caller could
 * write for itself: it holds the same all-or-nothing guarantee across the whole list, so a
 * bad element anywhere leaves the document untouched rather than half-edited. Which of the
 * two shapes the batch takes follows what the op does — an argument that means the same for
 * every object is given once (`setStyle`, `resizeObjects`), while one that differs per object
 * is given as a list of `entries` (`addObjects`, `setPositions`).
 *
 * A `get` / `list` / `find` prefix marks an op that only reads, and each one sits beside the
 * op that writes what it reads, so a write always has its counterpart in view. The naming
 * rules that make the pairs guessable are in ops/README.md.
 */
export type DocOps = {
	/**
	 * Add an object of `type`, mutating `doc` in place and returning the new id.
	 * Throws `DocOperationError` for a type this instance's definitions cannot create.
	 */
	addObject(doc: CanvasDoc, type: string, params: AddObjectParams): string;
	/**
	 * Add several objects at once, in the given order, and return their new ids positionally.
	 * Throws `DocOperationError` naming the entry at fault, having added none of them.
	 */
	addObjects(doc: CanvasDoc, entries: readonly AddObjectEntry[]): string[];
	/**
	 * Join two objects with a connector, mutating `doc` in place and returning the new id.
	 * Throws `DocOperationError` when an endpoint is missing or not connectable.
	 */
	connect(doc: CanvasDoc, params: ConnectParams): string;
	/**
	 * Add several connectors at once and return their new ids positionally. Endpoints are
	 * resolved against the doc as it already is, so objects to be wired up must be added first.
	 * Throws `DocOperationError` naming the entry at fault, having added none of them.
	 */
	connectMany(doc: CanvasDoc, entries: readonly ConnectParams[]): string[];
	/**
	 * Delete objects by id, cascading to a group's children and to connectors left dangling.
	 * Throws `DocOperationError` naming every id that was not found.
	 */
	deleteObjects(doc: CanvasDoc, ids: readonly string[]): DeleteObjectsResult;
	/**
	 * Move one object so its bounding box starts at the given top-left.
	 * Throws `DocOperationError` for a missing id or an object with no position of its own.
	 */
	setPosition(doc: CanvasDoc, id: string, params: SetPositionParams): void;
	/**
	 * Put each object at its own top-left, which is how a computed layout is applied; use
	 * `translateObjects` to shift a cluster without disturbing it.
	 * Throws `DocOperationError` naming the entry at fault, having moved nothing.
	 */
	setPositions(doc: CanvasDoc, entries: readonly SetPositionEntry[]): void;
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
	 * Give several objects the same size, each around its own top-left corner. An omitted
	 * axis keeps each object's current one, so the results match only on the axis given.
	 * Throws `DocOperationError` for a missing id, an unsizable object, or a size ≤ 0.
	 */
	resizeObjects(
		doc: CanvasDoc,
		ids: readonly string[],
		params: ResizeObjectParams,
	): void;
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
	 * Set the properties belonging to the type itself on one object (the callout's `tail`,
	 * the container's `headerHeight`), and return the names written. One object at a time,
	 * because these names belong to a single type.
	 * Throws `DocOperationError` for a missing id, a name the type does not declare, or a
	 * value the type rejects, having written nothing.
	 */
	setExtraProps(
		doc: CanvasDoc,
		id: string,
		extraProps: Readonly<Record<string, unknown>>,
	): string[];
	/**
	 * Turn several objects to the same angle, in clockwise degrees about each one's own centre,
	 * skipping and reporting the types that have no rotation.
	 * Throws `DocOperationError` for an angle that is not finite, or for a missing id.
	 */
	setRotation(
		doc: CanvasDoc,
		ids: readonly string[],
		rotation: number,
	): SetRotationResult;
	/**
	 * Replace the vertices of one polygon or polyline, which moves and resizes it with them.
	 * Throws `DocOperationError` for a missing id, a type not built from vertices, or vertices
	 * that are too few or not finite.
	 */
	setPoints(doc: CanvasDoc, id: string, points: readonly Point[]): void;
	/**
	 * Replace the vertices of several poly shapes, each with its own outline.
	 * Throws `DocOperationError` naming the entry at fault, having reshaped nothing.
	 */
	setPointsMany(doc: CanvasDoc, entries: readonly SetPointsEntry[]): void;
	/**
	 * Restack objects within the parent holding them, keeping their order relative to each other.
	 * Throws `DocOperationError` naming every id that was not found.
	 */
	reorderObjects(
		doc: CanvasDoc,
		ids: readonly string[],
		placement: ZOrderPlacement,
	): void;
	/**
	 * Read where an object sits among its siblings, which is what `reorderObjects` moves.
	 * Throws `DocOperationError` when the id is not in the doc.
	 */
	getZOrder(doc: CanvasDoc, id: string): GetZOrderResult;
	/**
	 * Rewrite one object's text: a shape's body, one named slot, or a connector's label.
	 * Throws `DocOperationError` for a missing id, a type holding no text, or an unknown slot.
	 */
	setText(doc: CanvasDoc, id: string, text: string, slot?: string): void;
	/**
	 * Rewrite the text of several objects, each with its own string and slot — how a whole
	 * diagram's labels are filled in at once.
	 * Throws `DocOperationError` naming the entry at fault, having rewritten nothing.
	 */
	setTexts(doc: CanvasDoc, entries: readonly SetTextEntry[]): void;
	/**
	 * Read one object's text as plain characters, styling dropped and rows joined by newlines.
	 * Throws `DocOperationError` for a missing id, a type holding no text, or an unknown slot.
	 */
	getText(doc: CanvasDoc, id: string, slot?: string): string;
	/**
	 * Style a stretch of one object's text, named by the text it holds, leaving the
	 * rest of it as it is.
	 * Throws `DocOperationError` for a missing id, a type or slot whose text is styled
	 * only as a whole, an unknown slot, or a stretch that does not occur.
	 */
	setInlineTextStyle(
		doc: CanvasDoc,
		id: string,
		params: InlineTextStyleParams,
	): void;
	/**
	 * Style one stretch of text per entry, which is also how several stretches within one
	 * object are styled — repeat its id.
	 * Throws `DocOperationError` naming the entry at fault, having styled nothing.
	 */
	setInlineTextStyles(
		doc: CanvasDoc,
		entries: readonly SetInlineTextStyleEntry[],
	): void;
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
	 * Change several connectors, each with its own changes. Every entry is checked against
	 * the connectors as they stand, so an id may appear only once.
	 * Throws `DocOperationError` naming the entry at fault, having changed nothing.
	 */
	updateConnectors(
		doc: CanvasDoc,
		entries: readonly UpdateConnectorEntry[],
	): void;
	/**
	 * Read the ids of the connectors with an end on this object, in drawing order; pass one to
	 * `getObject` for the connector itself. Throws `DocOperationError` when the id is not in
	 * the doc.
	 */
	getConnectors(doc: CanvasDoc, id: string): string[];
	/**
	 * Read the ids at the far end of those connectors, deduplicated; free ends and the object
	 * itself are left out. Throws `DocOperationError` when the id is not in the doc.
	 */
	getConnectedObjects(doc: CanvasDoc, id: string): string[];
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
	 * Throws `DocOperationError` for fewer than 2 distinct ids, a connector, or members of
	 * different parents.
	 */
	groupObjects(doc: CanvasDoc, ids: readonly string[]): string;
	/**
	 * Dissolve a group, putting its children back in its place and returning their ids.
	 * Throws `DocOperationError` when the id is not a group, or names a rotated one.
	 */
	dissolveGroup(doc: CanvasDoc, id: string): string[];
	/**
	 * Dissolve several groups and return what stands on its own afterwards — a group named
	 * in the same call is left out of that, since it is gone too.
	 * Throws `DocOperationError` naming the entry at fault, having dissolved nothing.
	 */
	dissolveGroups(doc: CanvasDoc, ids: readonly string[]): string[];
	/**
	 * Move objects already in the doc into an existing group, returning the groups they
	 * left empty. Throws `DocOperationError` for a missing id, a connector, a rotated
	 * target, or a move that would put the group inside itself.
	 */
	addObjectsToGroup(
		doc: CanvasDoc,
		groupId: string,
		ids: readonly string[],
	): string[];
	/**
	 * Take objects out of the group holding them, dropping a group left with nothing.
	 * Throws `DocOperationError` for a missing id, an object outside any group, or one
	 * held by a rotated group.
	 */
	removeObjectsFromGroup(
		doc: CanvasDoc,
		ids: readonly string[],
	): RemoveObjectsFromGroupResult;
	/**
	 * Read the group holding an object, or null when it sits at the root.
	 * Throws `DocOperationError` when the id is not in the doc.
	 */
	getParentGroup(doc: CanvasDoc, id: string): string | null;
	/**
	 * Read a group's direct children in drawing order; grandchildren belong to the group
	 * between. Throws `DocOperationError` when the id is missing or names something else.
	 */
	getGroupMembers(doc: CanvasDoc, groupId: string): string[];
	/**
	 * Read the combined bounding box of the given objects, or of the whole doc when `ids` is
	 * omitted; null when nothing measurable was found. Throws `DocOperationError` naming every
	 * id that was not found.
	 */
	getCombinedBounds(doc: CanvasDoc, ids?: readonly string[]): Rect | null;
	/**
	 * Read one object as it sits in the doc — the doc's own object, not a copy, carrying every
	 * field its type declares. Throws `DocOperationError` when the id is not in the doc.
	 */
	getObject(doc: CanvasDoc, id: string): Readonly<ObjectDoc>;
	/**
	 * Read one object's bounding box; null for a type that cannot be measured.
	 * Throws `DocOperationError` when the id is not in the doc.
	 */
	getObjectBounds(doc: CanvasDoc, id: string): Rect | null;
	/**
	 * Summarize every object, group children included and flattened, in drawing order. What a
	 * caller reads instead of the whole doc when it only needs to know what is there.
	 */
	listObjects(doc: CanvasDoc): ObjectSummary[];
	/**
	 * The same summaries, narrowed by type, text, enclosing rect or parent group. Every
	 * condition given must hold. Throws `DocOperationError` when `inGroup` names no group.
	 */
	findObjects(doc: CanvasDoc, filter: ObjectFilter): ObjectSummary[];
	/**
	 * Read the object types this instance handles and what each one can do — which are
	 * creatable, which accept a connector, what text and geometry they carry. Takes no doc:
	 * it answers from the definitions the instance was built with.
	 */
	listTypes(): ObjectTypeSummary[];
};

/**
 * Build a {@link DocOps}. `create` here is the factory prefix — it makes the instance, and
 * that instance covers editing just as much as building (see {@link DocOps}).
 *
 * @param config - Resolved by {@link resolveDocDefinitions}, whose preset/plugin merging and
 *   duplicate-type detection mirror createCanvasParser. Omit to handle only built-in definitions
 */
export const createDocOps = (config?: DocDefinitionsConfig): DocOps => {
	const definitions = resolveDocDefinitions(config);
	return {
		addObject: (doc, type, params) => addObject(doc, type, params, definitions),
		addObjects: (doc, entries) => addObjects(doc, entries, definitions),
		connect: (doc, params) => connect(doc, params, definitions),
		connectMany: (doc, entries) => connectMany(doc, entries, definitions),
		deleteObjects: (doc, ids) => deleteObjects(doc, ids),
		setPosition: (doc, id, params) => setPosition(doc, id, params, definitions),
		setPositions: (doc, entries) => setPositions(doc, entries, definitions),
		translateObjects: (doc, ids, deltaX, deltaY) =>
			translateObjects(doc, ids, deltaX, deltaY, definitions),
		resizeObject: (doc, id, params) =>
			resizeObject(doc, id, params, definitions),
		resizeObjects: (doc, ids, params) =>
			resizeObjects(doc, ids, params, definitions),
		setStyle: (doc, ids, style) => setStyle(doc, ids, style, definitions),
		setExtraProps: (doc, id, extraProps) =>
			setExtraProps(doc, id, extraProps, definitions),
		setInlineTextStyle: (doc, id, params) =>
			setInlineTextStyle(doc, id, params, definitions),
		setInlineTextStyles: (doc, entries) =>
			setInlineTextStyles(doc, entries, definitions),
		setRotation: (doc, ids, rotation) =>
			setRotation(doc, ids, rotation, definitions),
		setPoints: (doc, id, points) => setPoints(doc, id, points, definitions),
		setPointsMany: (doc, entries) => setPointsMany(doc, entries, definitions),
		reorderObjects: (doc, ids, placement) =>
			reorderObjects(doc, ids, placement),
		getZOrder: (doc, id) => getZOrder(doc, id),
		setText: (doc, id, text, slot) => setText(doc, id, text, slot, definitions),
		setTexts: (doc, entries) => setTexts(doc, entries, definitions),
		getText: (doc, id, slot) => getText(doc, id, slot, definitions),
		updateConnector: (doc, id, params) =>
			updateConnector(doc, id, params, definitions),
		updateConnectors: (doc, entries) =>
			updateConnectors(doc, entries, definitions),
		getConnectors: (doc, id) => getConnectors(doc, id),
		getConnectedObjects: (doc, id) => getConnectedObjects(doc, id),
		alignObjects: (doc, ids, edge) => alignObjects(doc, ids, edge, definitions),
		distributeObjects: (doc, ids, axis, spacing) =>
			distributeObjects(doc, ids, axis, spacing, definitions),
		groupObjects: (doc, ids) => groupObjects(doc, ids),
		dissolveGroup: (doc, id) => dissolveGroup(doc, id),
		dissolveGroups: (doc, ids) => dissolveGroups(doc, ids),
		addObjectsToGroup: (doc, groupId, ids) =>
			addObjectsToGroup(doc, groupId, ids),
		removeObjectsFromGroup: (doc, ids) => removeObjectsFromGroup(doc, ids),
		getParentGroup: (doc, id) => getParentGroup(doc, id),
		getGroupMembers: (doc, groupId) => getGroupMembers(doc, groupId),
		getCombinedBounds: (doc, ids) => getCombinedBounds(doc, ids, definitions),
		getObject: (doc, id) => getObject(doc, id),
		getObjectBounds: (doc, id) => getObjectBounds(doc, id, definitions),
		listObjects: (doc) => listObjects(doc, definitions),
		findObjects: (doc, filter) => findObjects(doc, filter, definitions),
		listTypes: () => listTypes(definitions),
	};
};
