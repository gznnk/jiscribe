import type { Point } from "@workspace/geometry";

import { DocOperationError } from "./errors";
import { findObject } from "./objectAccess";
import type { DocDefinitions } from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type {
	ConnectPointId,
	EdgeAnchorSide,
	EdgeAnchorSpec,
	EndpointRef,
	FreeEndpointRef,
	OwnedEndpointRef,
} from "../schemas/objects/types/EndpointRef";
import {
	EdgeAnchorSides,
	isEdgeAnchorSide,
	isOwnedEndpointRef,
} from "../schemas/objects/types/EndpointRef";

/** Which end of a connector an operation is working on; names the parameters in errors. */
export type ConnectorEnd = "source" | "target";

/** A free position along one edge, for what the named edge midpoints cannot express. */
export type EdgeAnchorHandle = {
	/** Which of the owner's four local edges the anchor rides; see {@link EdgeAnchorSpec}. */
	side: EdgeAnchorSide;
	/**
	 * Position along that edge, 0..1; see {@link EdgeAnchorSpec}. Anything else,
	 * including NaN and Infinity, is rejected rather than clamped.
	 */
	t: number;
};

/**
 * Selectable anchor position. "center" becomes a CenterAnchorSpec, an edge midpoint id
 * becomes a connectPoint, and an {@link EdgeAnchorHandle} becomes an EdgeAnchorSpec;
 * "center" is never a connectPoint id.
 */
export type AnchorHandleId = "center" | ConnectPointId | EdgeAnchorHandle;

/**
 * Check an endpoint candidate and return its id.
 *
 * @param doc - Searched but not modified
 * @param id - Candidate endpoint's id, looked up through group children as well, since
 *   ids are unique across the whole root tree (#115)
 * @param definitions - Type table whose `features.connectable` decides what is legal
 * @returns `id` unchanged, so the check reads as a step in building the endpoint
 * @throws {@link DocOperationError} with a user-facing message when the object is missing
 *   or its type is not connectable
 */
export const requireConnectable = (
	doc: CanvasDoc,
	id: string,
	definitions: DocDefinitions,
): string => {
	const found = findObject(doc, id);
	if (found === undefined) {
		throw new DocOperationError(`object not found: ${id}`);
	}
	const definition = definitions.get(found.object.type);
	if (definition === undefined || definition.features.connectable !== true) {
		const connectableTypes = [...definitions]
			.filter(([, candidate]) => candidate.features.connectable === true)
			.map(([candidateType]) => candidateType);
		throw new DocOperationError(
			`object ${id} is "${found.object.type}" which is not connectable (connectable: ${connectableTypes.join(" / ")}).`,
		);
	}
	return id;
};

/** Check an edge handle's fields, so a bad ratio never reaches the doc. */
const buildEdgeAnchor = (handle: EdgeAnchorHandle): EdgeAnchorSpec => {
	if (!isEdgeAnchorSide(handle.side)) {
		throw new DocOperationError(
			`edge anchor side must be one of ${EdgeAnchorSides.join(" / ")}, got ${JSON.stringify(handle.side)}`,
		);
	}
	if (!Number.isFinite(handle.t) || handle.t < 0 || handle.t > 1) {
		throw new DocOperationError(
			`edge anchor t must be between 0 and 1, got ${handle.t}`,
		);
	}
	return { kind: "edge", side: handle.side, t: handle.t };
};

/**
 * Anchor spec for a handle id; an omitted handle means the shape's centre.
 *
 * @param anchorId - "center", an edge midpoint id, or an {@link EdgeAnchorHandle} for a
 *   free position along one edge; undefined reads the same as "center"
 * @returns The anchor to store on an owned endpoint
 * @throws {@link DocOperationError} when an edge handle carries a side outside
 *   top / right / bottom / left, or a `t` that is not a finite number in 0..1
 */
export const buildAnchor = (
	anchorId: AnchorHandleId | undefined,
): OwnedEndpointRef["anchor"] => {
	if (anchorId === undefined || anchorId === "center") {
		return { kind: "center" };
	}
	if (typeof anchorId === "string") {
		return { kind: "connectPoint", id: anchorId };
	}
	return buildEdgeAnchor(anchorId);
};

/**
 * Endpoint owned by `ownerId`, anchored where `anchorId` says (centre when omitted).
 *
 * @throws {@link DocOperationError} for an unusable edge handle; see {@link buildAnchor}
 */
export const buildEndpoint = (
	ownerId: string,
	anchorId: AnchorHandleId | undefined,
): OwnedEndpointRef => ({
	owner: { id: ownerId },
	anchor: buildAnchor(anchorId),
});

/**
 * Endpoint standing at a coordinate, attached to no object.
 *
 * @param point - Where the end sits, in world coordinates; copied, so a later change to the
 *   caller's object does not reach the doc. Both components must be finite: NaN and Infinity
 *   are rejected rather than written out, since JSON turns them into null
 * @param end - Which end is being built; only names the offending parameter in the error
 * @returns The endpoint to store, which carries no `owner` key at all
 * @throws {@link DocOperationError} when either component is not a finite number
 */
export const buildFreeEndpoint = (
	point: Point,
	end: ConnectorEnd,
): FreeEndpointRef => {
	if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
		throw new DocOperationError(
			`${end}Point must have finite x and y, got x=${point.x}, y=${point.y}`,
		);
	}
	return { anchor: { kind: "free", point: { x: point.x, y: point.y } } };
};

/**
 * Check that one end asks for a single destination: an object, or a coordinate, never both.
 *
 * @param end - Which end is being checked; names the parameters in the message
 * @param ownerId - The object the end should attach to, undefined when not asked for
 * @param point - The coordinate the end should stand at, undefined when not asked for
 * @param anchorId - The anchor asked for alongside; an anchor is a position on an object,
 *   so pairing it with `point` is rejected rather than ignored
 * @throws {@link DocOperationError} when the end names both an object and a coordinate, or
 *   pairs a coordinate with an anchor
 */
export const requireSingleEndpointTarget = (
	end: ConnectorEnd,
	ownerId: string | undefined,
	point: Point | undefined,
	anchorId: AnchorHandleId | undefined,
): void => {
	if (ownerId !== undefined && point !== undefined) {
		throw new DocOperationError(
			`the ${end} end got both ${end}Id and ${end}Point; give just one (${end}Id to attach it to an object, ${end}Point to leave it standing at a coordinate)`,
		);
	}
	if (point !== undefined && anchorId !== undefined) {
		throw new DocOperationError(
			`the ${end} end got both ${end}Point and ${end}Anchor, but an anchor is a position on an object; drop ${end}Anchor, or replace ${end}Point with ${end}Id`,
		);
	}
};

/**
 * Check the connector invariant that at least one end is attached to an object.
 *
 * @param source - The endpoint the connector leaves, as it is about to be stored
 * @param target - The endpoint the connector enters, as it is about to be stored
 * @throws {@link DocOperationError} when both ends are free; the doc model rejects such a
 *   connector (validateConnectorDoc 参照), so it must never be written
 */
export const requireOwnedEnd = (
	source: EndpointRef,
	target: EndpointRef,
): void => {
	if (isOwnedEndpointRef(source) || isOwnedEndpointRef(target)) {
		return;
	}
	throw new DocOperationError(
		`a connector must keep at least one end attached to an object; attach one with sourceId or targetId, or add a "polyline" object for a line that hangs on nothing`,
	);
};
