import type { Point } from "@jiscribe/geometry";

import {
	type AnchorHandleId,
	buildAnchor,
	buildFreeEndpoint,
	type ConnectorEnd,
	requireConnectable,
	requireOwnedEnd,
	requireSingleEndpointTarget,
} from "./connectorEndpoints";
import { DocOperationError } from "./errors";
import { type ObjectRecord, requireObject } from "./objectAccess";
import { type DocDefinitions, isConnectorObject } from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ArrowType } from "../schemas/objects/types/ArrowType";
import {
	type ConnectorRouting,
	defaultRoutingForAnchors,
} from "../schemas/objects/types/ConnectorRouting";
import type { EndpointRef } from "../schemas/objects/types/EndpointRef";

export type UpdateConnectorParams = {
	/** Re-attach the source end to this object; omitted keeps the object it is on. */
	sourceId?: string;
	/** Re-attach the target end to this object; omitted keeps the object it is on. */
	targetId?: string;
	/**
	 * Detach the source end and stand it at this world coordinate; exclusive with `sourceId`
	 * and `sourceAnchor`, and refused when it would leave both ends unattached.
	 */
	sourcePoint?: Point;
	/**
	 * Detach the target end and stand it at this world coordinate; exclusive with `targetId`
	 * and `targetAnchor`, and refused when it would leave both ends unattached.
	 */
	targetPoint?: Point;
	/** Move the source end to this anchor; omitted keeps the current anchor. */
	sourceAnchor?: AnchorHandleId;
	/** Move the target end to this anchor; omitted keeps the current anchor. */
	targetAnchor?: AnchorHandleId;
	/** Arrowhead at the source end; "None" removes it. */
	startArrow?: ArrowType;
	/** Arrowhead at the target end; "None" removes it. */
	endArrow?: ArrowType;
	/** Line shape; omitted keeps it, except when re-anchoring a connector that never set one. */
	routing?: ConnectorRouting;
	/**
	 * The route's corners, in world coordinates, source → target; endpoint coordinates are
	 * not included. An empty array hands the whole route back to the engine.
	 */
	points?: readonly Point[];
	/** Where the label sits along the line, 0 at the source to 1 at the target. */
	labelPosition?: number;
	/** How far the label sits off the line, in px; the sign picks the side. */
	labelOffset?: number;
};

/** Rebuild one end, keeping whatever the params leave out; undefined leaves the end alone. */
const nextEndpoint = (
	doc: CanvasDoc,
	end: ConnectorEnd,
	current: EndpointRef | undefined,
	ownerId: string | undefined,
	point: Point | undefined,
	anchorId: AnchorHandleId | undefined,
	definitions: DocDefinitions,
): EndpointRef | undefined => {
	requireSingleEndpointTarget(end, ownerId, point, anchorId);
	if (point !== undefined) {
		return buildFreeEndpoint(point, end);
	}
	if (ownerId === undefined && anchorId === undefined) {
		return undefined;
	}
	const nextOwnerId = ownerId ?? current?.owner?.id;
	if (nextOwnerId === undefined) {
		throw new DocOperationError(
			`the ${end} end is not attached to an object, so give ${end}Id to attach it`,
		);
	}
	requireConnectable(doc, nextOwnerId, definitions);
	// A free anchor carries a coordinate that means nothing once the end is owned.
	const keptAnchor =
		current?.anchor !== undefined && current.anchor.kind !== "free"
			? current.anchor
			: undefined;
	return {
		owner: { id: nextOwnerId },
		anchor:
			anchorId !== undefined
				? buildAnchor(anchorId)
				: (keptAnchor ?? { kind: "center" }),
	};
};

const setLabelPlacement = (
	connector: ObjectRecord,
	params: UpdateConnectorParams,
): void => {
	if (params.labelPosition === undefined && params.labelOffset === undefined) {
		return;
	}
	const label = connector.label;
	if (typeof label !== "object" || label === null) {
		throw new DocOperationError(
			`${connector.id} has no label to place; give it label text first`,
		);
	}
	const placed = label as Record<string, unknown>;
	if (params.labelPosition !== undefined) {
		placed.position = params.labelPosition;
	}
	if (params.labelOffset !== undefined) {
		placed.offset = params.labelOffset;
	}
};

/**
 * Change an existing connector: where it attaches, how it is routed, its arrowheads, and
 * where its label sits. Mutates `doc` in place.
 *
 * This is the way out of a route that crosses the wrong shape — pin the ends to the edges
 * facing each other, or give the corners explicitly through `points`. A non-empty `points`
 * **is** the path, so the engine no longer routes around anything; pass `[]` to hand the
 * route back to it.
 *
 * @param doc - Mutated in place
 * @param id - Id of the connector to change; must exist and be a connector
 * @param params - The properties to change; omitted ones are kept. Re-anchoring a connector
 *   that never stored a `routing` re-derives the default, so pinning both ends to edges
 *   turns a straight line into a right-angled one
 * @param definitions - Type table whose `features.connectable` decides which endpoints are legal
 * @throws {@link DocOperationError} when the id is missing or is not a connector, when an end
 *   names both an object and a point, when a new endpoint is missing, not connectable or
 *   carries an unusable edge anchor (see {@link AnchorHandleId}), when detaching would leave
 *   both ends free, or when a label placement is given for a connector that has no label
 */
export const updateConnector = (
	doc: CanvasDoc,
	id: string,
	params: UpdateConnectorParams,
	definitions: DocDefinitions,
): void => {
	const { object } = requireObject(doc, id);
	if (!isConnectorObject(object)) {
		throw new DocOperationError(`${id} is "${object.type}", not a connector`);
	}

	const currentSource = object.source as EndpointRef;
	const currentTarget = object.target as EndpointRef;
	const source = nextEndpoint(
		doc,
		"source",
		currentSource,
		params.sourceId,
		params.sourcePoint,
		params.sourceAnchor,
		definitions,
	);
	const target = nextEndpoint(
		doc,
		"target",
		currentTarget,
		params.targetId,
		params.targetPoint,
		params.targetAnchor,
		definitions,
	);
	if (source !== undefined || target !== undefined) {
		requireOwnedEnd(source ?? currentSource, target ?? currentTarget);
	}
	// Placement is validated before anything is written, so a rejected call changes nothing.
	setLabelPlacement(object, params);

	if (source !== undefined) {
		object.source = source;
	}
	if (target !== undefined) {
		object.target = target;
	}

	if (params.routing !== undefined) {
		object.routing = params.routing;
	} else if (
		(source !== undefined || target !== undefined) &&
		object.routing === undefined
	) {
		// No stored routing means the connector never chose one, so the anchors decide it
		// exactly as they do at creation (see defaultRoutingForAnchors).
		const derived = defaultRoutingForAnchors(
			(object.source as EndpointRef).anchor,
			(object.target as EndpointRef).anchor,
		);
		if (derived !== undefined) {
			object.routing = derived;
		}
	}

	if (params.points !== undefined) {
		object.points = [...params.points];
	}
	if (params.startArrow !== undefined) {
		object.startArrow = params.startArrow;
	}
	if (params.endArrow !== undefined) {
		object.endArrow = params.endArrow;
	}
};
