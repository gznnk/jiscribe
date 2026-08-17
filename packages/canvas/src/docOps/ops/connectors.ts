import type { Point } from "@jiscribe/geometry";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import type { ArrowType } from "../../schemas/objects/types/ArrowType";
import {
	type ConnectorRouting,
	defaultRoutingForAnchors,
} from "../../schemas/objects/types/ConnectorRouting";
import type { EndpointRef } from "../../schemas/objects/types/EndpointRef";
import { DocOperationError } from "../errors";
import { batchItemError } from "../utils/batchErrors";
import {
	type AnchorHandleId,
	buildAnchor,
	buildEndpoint,
	buildFreeEndpoint,
	type ConnectorEnd,
	requireConnectable,
	requireOwnedEnd,
	requireSingleEndpointTarget,
} from "../utils/connectorEndpoints";
import { generateUniqueId } from "../utils/ids";
import {
	type ObjectRecord,
	rejectIds,
	requireObject,
} from "../utils/objectAccess";
import {
	type DocDefinitions,
	isConnectorObject,
} from "../utils/objectGeometry";

export type ConnectParams = {
	/**
	 * Id of the object the connector leaves; must exist in the root tree and be connectable.
	 * Give `sourcePoint` instead to leave the end hanging, never both.
	 */
	sourceId?: string;
	/**
	 * Id of the object the connector enters; must exist in the root tree and be connectable.
	 * Give `targetPoint` instead to leave the end hanging, never both.
	 */
	targetId?: string;
	/**
	 * World coordinate the connector leaves from when the end attaches to no object; exclusive
	 * with `sourceId` and with `sourceAnchor`. The point stays put while shapes move, and the
	 * other end must be attached, since a line hanging on nothing is a polyline.
	 */
	sourcePoint?: Point;
	/**
	 * World coordinate the connector runs to when the end attaches to no object; exclusive
	 * with `targetId` and with `targetAnchor`. The point stays put while shapes move, and the
	 * other end must be attached, since a line hanging on nothing is a polyline.
	 */
	targetPoint?: Point;
	/** Where on the source object the connector leaves; omitted means "center". */
	sourceAnchor?: AnchorHandleId;
	/** Where on the target object the connector enters; omitted means "center". */
	targetAnchor?: AnchorHandleId;
	/** Arrowhead at the source end; omitted leaves the property off the doc entirely. */
	startArrow?: ArrowType;
	/** Arrowhead at the target end; omitted leaves the property off the doc entirely. */
	endArrow?: ArrowType;
	/** Label drawn on the line; omitted or empty leaves the connector unlabelled. */
	label?: string;
	/**
	 * Line shape; omitted derives it from the anchors, which is what makes a
	 * centre-to-centre connector straight. A free end derives like an edge anchor, so
	 * it stays right-angled unless the other end is a centre.
	 */
	routing?: ConnectorRouting;
	/**
	 * Corners the route bends at, in world coordinates, source → target; endpoint
	 * coordinates are not included. Omitted or empty lets the engine route the whole path.
	 */
	points?: readonly Point[];
};

/** Endpoint for one end: attached to an object, or standing at a coordinate. */
const buildRequestedEndpoint = (
	doc: CanvasDoc,
	end: ConnectorEnd,
	ownerId: string | undefined,
	point: Point | undefined,
	anchorId: AnchorHandleId | undefined,
	definitions: DocDefinitions,
): EndpointRef => {
	requireSingleEndpointTarget(end, ownerId, point, anchorId);
	if (point !== undefined) {
		return buildFreeEndpoint(point, end);
	}
	if (ownerId === undefined) {
		throw new DocOperationError(
			`the ${end} end got neither ${end}Id nor ${end}Point; give ${end}Id to attach it to an object, or ${end}Point to leave it standing at a coordinate`,
		);
	}
	return buildEndpoint(requireConnectable(doc, ownerId, definitions), anchorId);
};

/**
 * Build the connector `connect` would push, id included, without touching `doc`.
 *
 * @param reservedIds - Ids already handed out to connectors staged but not yet pushed
 */
const buildConnector = (
	doc: CanvasDoc,
	params: ConnectParams,
	definitions: DocDefinitions,
	reservedIds?: ReadonlySet<string>,
): ObjectDoc => {
	const source = buildRequestedEndpoint(
		doc,
		"source",
		params.sourceId,
		params.sourcePoint,
		params.sourceAnchor,
		definitions,
	);
	const target = buildRequestedEndpoint(
		doc,
		"target",
		params.targetId,
		params.targetPoint,
		params.targetAnchor,
		definitions,
	);
	requireOwnedEnd(source, target);

	const id = generateUniqueId(doc, "connector", reservedIds);
	// A center endpoint defaults to straight; anchors that carry a direction, and free ends,
	// leave routing omitted.
	const routing =
		params.routing ?? defaultRoutingForAnchors(source.anchor, target.anchor);
	const connector = {
		id,
		type: "connector",
		source,
		target,
		points: params.points !== undefined ? [...params.points] : [],
		...(routing !== undefined ? { routing } : {}),
		...(params.startArrow !== undefined
			? { startArrow: params.startArrow }
			: {}),
		...(params.endArrow !== undefined ? { endArrow: params.endArrow } : {}),
		...(params.label !== undefined && params.label !== ""
			? { label: { text: params.label } }
			: {}),
	};
	return connector as unknown as ObjectDoc;
};

/**
 * Connect two ends with a connector and return the generated id.
 *
 * Each end goes to an object (`sourceId` / `targetId`) or to a bare coordinate
 * (`sourcePoint` / `targetPoint`), never to both and never to neither. At least one end must
 * be attached: two loose ends make a polyline, which the doc model rejects as a connector.
 *
 * @param doc - Mutated in place: the created connector is pushed onto `doc.root`
 * @param params - Both endpoints, plus optional anchors, arrowheads, label and route; the
 *   anchor kinds decide the default routing, so a center endpoint yields a straight line
 * @param definitions - Type table whose `features.connectable` decides which endpoints are legal
 * @returns The id assigned to the new connector, `connector-N` unique across the root tree
 * @throws {@link DocOperationError} with a user-facing message when an end names both an object
 *   and a point or neither, when an object is missing from the root tree, is not connectable or
 *   carries an unusable edge anchor (see {@link AnchorHandleId}), when a point is not finite, or
 *   when both ends would be free
 */
export const connect = (
	doc: CanvasDoc,
	params: ConnectParams,
	definitions: DocDefinitions,
): string => {
	const connector = buildConnector(doc, params, definitions);
	doc.root.push(connector);
	return connector.id;
};

/**
 * Draw several connectors in one go and return their ids in the order given, mutating `doc`
 * in place.
 *
 * Each connector is built exactly as {@link connect} would build it, and every one is built
 * before any is pushed, so a call that throws leaves the document untouched. Endpoints are
 * resolved against the document as it stands, which means **an id created earlier in the same
 * batch cannot be connected to**: add the objects with `addObjects` first, then connect them.
 *
 * @param doc - Mutated in place: the created connectors are pushed onto `doc.root`, in the
 *   order they appear in `entries`
 * @param entries - One endpoint pair per connector, with the same optional anchors,
 *   arrowheads, label and route `connect` takes; an empty array is a no-op returning an empty
 *   array. Several connectors may name the same object and anchor
 * @param definitions - Type table whose `features.connectable` decides which endpoints are legal
 * @returns The assigned ids, positionally matching `entries`
 * @throws {@link DocOperationError} for anything {@link connect} rejects, prefixed with
 *   `entries[i]` so the offending element can be told apart
 */
export const connectMany = (
	doc: CanvasDoc,
	entries: readonly ConnectParams[],
	definitions: DocDefinitions,
): string[] => {
	const reservedIds = new Set<string>();
	const staged: ObjectDoc[] = [];
	entries.forEach((params, index) => {
		let connector: ObjectDoc;
		try {
			connector = buildConnector(doc, params, definitions, reservedIds);
		} catch (error) {
			throw batchItemError("entries", index, undefined, error);
		}
		reservedIds.add(connector.id);
		staged.push(connector);
	});

	doc.root.push(...staged);
	return staged.map((connector) => connector.id);
};

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

/**
 * The label record a placement will be written to.
 *
 * @returns undefined when the params ask for no placement, so the caller writes nothing
 * @throws {@link DocOperationError} when a placement is asked for on a connector that
 *   carries no label
 */
const requireLabelRecord = (
	connector: ObjectRecord,
	params: UpdateConnectorParams,
): Record<string, unknown> | undefined => {
	if (params.labelPosition === undefined && params.labelOffset === undefined) {
		return undefined;
	}
	const label = connector.label;
	if (typeof label !== "object" || label === null) {
		throw new DocOperationError(
			`${connector.id} has no label to place; give it label text first`,
		);
	}
	return label as Record<string, unknown>;
};

/**
 * One validated connector change: the endpoints as they are about to be stored, and the
 * record a label placement goes on. Everything here is decided while the doc is still
 * untouched, so writing it out cannot fail.
 */
type ConnectorWrite = {
	/** The connector being changed. */
	connector: ObjectRecord;
	/** Endpoint to store on the source end; undefined leaves that end as it is. */
	source: EndpointRef | undefined;
	/** Endpoint to store on the target end; undefined leaves that end as it is. */
	target: EndpointRef | undefined;
	/** Record `labelPosition` / `labelOffset` go on; undefined when neither was given. */
	label: Record<string, unknown> | undefined;
	/** The requested change, which the fields written verbatim are read back from. */
	params: UpdateConnectorParams;
};

/** Resolve one connector change, failing before any of it is written. */
const planConnectorUpdate = (
	doc: CanvasDoc,
	id: string,
	params: UpdateConnectorParams,
	definitions: DocDefinitions,
): ConnectorWrite => {
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
	return {
		connector: object,
		source,
		target,
		label: requireLabelRecord(object, params),
		params,
	};
};

/** Write out a planned change; every value it stores has already been checked. */
const applyConnectorUpdate = ({
	connector,
	source,
	target,
	label,
	params,
}: ConnectorWrite): void => {
	if (label !== undefined) {
		if (params.labelPosition !== undefined) {
			label.position = params.labelPosition;
		}
		if (params.labelOffset !== undefined) {
			label.offset = params.labelOffset;
		}
	}

	if (source !== undefined) {
		connector.source = source;
	}
	if (target !== undefined) {
		connector.target = target;
	}

	if (params.routing !== undefined) {
		connector.routing = params.routing;
	} else if (
		(source !== undefined || target !== undefined) &&
		connector.routing === undefined
	) {
		// No stored routing means the connector never chose one, so the anchors decide it
		// exactly as they do at creation (see defaultRoutingForAnchors).
		const derived = defaultRoutingForAnchors(
			(connector.source as EndpointRef).anchor,
			(connector.target as EndpointRef).anchor,
		);
		if (derived !== undefined) {
			connector.routing = derived;
		}
	}

	if (params.points !== undefined) {
		connector.points = [...params.points];
	}
	if (params.startArrow !== undefined) {
		connector.startArrow = params.startArrow;
	}
	if (params.endArrow !== undefined) {
		connector.endArrow = params.endArrow;
	}
};

/** Ids listed more than once, each named once, in the order they were first repeated. */
const findRepeatedIds = (ids: readonly string[]): string[] => {
	const seenIds = new Set<string>();
	const repeatedIds = new Set<string>();
	for (const id of ids) {
		if (seenIds.has(id)) {
			repeatedIds.add(id);
		} else {
			seenIds.add(id);
		}
	}
	return [...repeatedIds];
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
	applyConnectorUpdate(planConnectorUpdate(doc, id, params, definitions));
};

/** One connector's changes in an {@link updateConnectors} call. */
export type UpdateConnectorEntry = {
	/**
	 * Id of the connector to change; must exist, be a connector, and appear only once
	 * in the call.
	 */
	id: string;
} & UpdateConnectorParams;

/**
 * Change several connectors in one call, mutating `doc` in place.
 *
 * Every entry is resolved against the document as it stands before the call, and only
 * then written, so a call that throws leaves the document exactly as it was — a loop of
 * {@link updateConnector} would stop half way through with the earlier connectors
 * already re-attached.
 *
 * @param doc - Mutated in place
 * @param entries - One entry per connector, written in the order given; an empty array is
 *   a no-op. An id may appear only once: two entries for one connector would each be
 *   checked against the endpoints it had before the call, and a pair that detaches one
 *   end each would pass both checks and still leave the connector attached to nothing
 * @param definitions - Type table whose `features.connectable` decides which endpoints
 *   are legal
 * @throws {@link DocOperationError} naming every repeated id, or for any reason
 *   {@link updateConnector} throws for, with the offending entry named as `entries[i] (id)`
 *   and the document still untouched
 */
export const updateConnectors = (
	doc: CanvasDoc,
	entries: readonly UpdateConnectorEntry[],
	definitions: DocDefinitions,
): void => {
	rejectIds(
		findRepeatedIds(entries.map(({ id }) => id)),
		"given more than once; put every change to one connector in a single entry",
	);
	const writes = entries.map((entry, index) => {
		try {
			return planConnectorUpdate(doc, entry.id, entry, definitions);
		} catch (error) {
			throw batchItemError("entries", index, entry.id, error);
		}
	});
	for (const write of writes) {
		applyConnectorUpdate(write);
	}
};

/** The objects a connector's two ends are attached to; a free end contributes nothing. */
const endpointOwnerIds = (connector: ObjectRecord): string[] =>
	[connector.source, connector.target].flatMap((endpoint) => {
		const ownerId = (endpoint as EndpointRef | undefined)?.owner?.id;
		return ownerId === undefined ? [] : [ownerId];
	});

/** The connectors holding `id` at either end, in drawing order, `id` itself unchecked. */
const collectConnectors = (doc: CanvasDoc, id: string): ObjectRecord[] =>
	(doc.root as ObjectRecord[]).filter(
		(object) =>
			isConnectorObject(object) && endpointOwnerIds(object).includes(id),
	);

/**
 * The connectors attached to one object, in drawing order — what tells a caller which
 * lines a shape carries before moving, restyling or deleting it.
 *
 * @param doc - Searched but not modified; only `doc.root` is scanned, a connector being
 *   barred from a group's children (see validateStructure)
 * @param id - Id of the object the connectors hang on; must exist in the root tree.
 *   A connector's own id yields an empty array, since a connector is never an endpoint owner
 * @returns The id of every connector holding `id` at either end, in drawing order, each
 *   listed once however many of its ends are on it, so a self-loop appears the same as any
 *   other; empty when nothing is attached to the object. Pass one to {@link getObject} for
 *   the connector itself, or to {@link updateConnector} to change it
 * @throws {@link DocOperationError} when no object carries the id
 */
export const getConnectors = (doc: CanvasDoc, id: string): string[] => {
	requireObject(doc, id);
	return collectConnectors(doc, id).map(({ id: connectorId }) => connectorId);
};

/**
 * The objects at the far end of the connectors attached to one object — its neighbours in
 * the graph the diagram draws.
 *
 * @param doc - Searched but not modified
 * @param id - Id of the object to start from; must exist in the root tree
 * @returns The other end's owner id per connector, in the connectors' drawing order and
 *   each listed once however many connectors lead to it. A free end contributes nothing,
 *   and a self-loop leaves `id` out of its own result, so the length is not the number of
 *   connectors {@link getConnectors} returns
 * @throws {@link DocOperationError} when no object carries the id
 */
export const getConnectedObjects = (doc: CanvasDoc, id: string): string[] => {
	requireObject(doc, id);
	const ownerIds = collectConnectors(doc, id).flatMap(endpointOwnerIds);
	return [...new Set(ownerIds)].filter((ownerId) => ownerId !== id);
};
