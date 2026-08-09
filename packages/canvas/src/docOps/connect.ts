import type { Point } from "@workspace/geometry";

import {
	type AnchorHandleId,
	buildEndpoint,
	buildFreeEndpoint,
	type ConnectorEnd,
	requireConnectable,
	requireOwnedEnd,
	requireSingleEndpointTarget,
} from "./connectorEndpoints";
import { DocOperationError } from "./errors";
import { generateUniqueId } from "./ids";
import type { DocDefinitions } from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ArrowType } from "../schemas/objects/types/ArrowType";
import {
	type ConnectorRouting,
	defaultRoutingForAnchors,
} from "../schemas/objects/types/ConnectorRouting";
import type { EndpointRef } from "../schemas/objects/types/EndpointRef";

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
export function connect(
	doc: CanvasDoc,
	params: ConnectParams,
	definitions: DocDefinitions,
): string {
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

	const id = generateUniqueId(doc, "connector");
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
	doc.root.push(connector as unknown as ObjectDoc);
	return id;
}
