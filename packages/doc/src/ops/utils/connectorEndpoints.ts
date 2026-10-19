import type { Point } from "@jiscribe/geometry";

import { DocOperationError } from "../errors";
import { findObject } from "./objectAccess";
import type { DocDefinitions } from "./objectGeometry";
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type {
	ConnectPointId,
	EdgeAnchorSide,
	EdgeAnchorSpec,
	EndpointRef,
	FreeEndpointRef,
	OwnedEndpointRef,
} from "../../model/objects/types/EndpointRef";
import {
	ConnectPointIds,
	EdgeAnchorSides,
	isConnectPointId,
	isEdgeAnchorSide,
	isOwnedEndpointRef,
} from "../../model/objects/types/EndpointRef";
import { listConnectPointIds } from "../../plugin/listConnectPointIds";

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
 * Selectable anchor position. "center" becomes a CenterAnchorSpec, any other string
 * becomes a connectPoint, and an {@link EdgeAnchorHandle} becomes an EdgeAnchorSpec;
 * "center" is never a connectPoint id. A string other than an edge midpoint id must be
 * one the owner's type declares (`ObjectDocDefinition.extraConnectPointIds`, an ER
 * entity's `col:<i>:left`), which the ops check against the owner as it stands.
 */
export type AnchorHandleId =
	// `string & {}` keeps the named ids offered as completions next to the open set.
	"center" | ConnectPointId | (string & {}) | EdgeAnchorHandle;

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
 * @param anchorId - "center", a connect point id, or an {@link EdgeAnchorHandle} for a
 *   free position along one edge; undefined reads the same as "center". Whether the
 *   owner offers a connect point id is not checked here (see
 *   {@link requireOfferedConnectPoint})
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

/** Declared ids past this many are elided in a refusal, keeping the first and last pairs. */
const MAX_LISTED_DECLARED_CONNECT_POINT_IDS = 6;

/** The connect point ids an object offers, as one clause of a refusal. */
const describeOfferedConnectPointIds = (
	offeredIds: readonly string[],
): string => {
	const declaredIds = offeredIds.slice(ConnectPointIds.length);
	const listedIds =
		declaredIds.length > MAX_LISTED_DECLARED_CONNECT_POINT_IDS
			? [...declaredIds.slice(0, 2), "…", ...declaredIds.slice(-2)]
			: declaredIds;
	const builtinList = ConnectPointIds.join(", ");
	if (declaredIds.length === 0) {
		return builtinList;
	}
	return `${builtinList} and the ${declaredIds.length} its type declares: ${listedIds.join(", ")}`;
};

/**
 * Check that a connectPoint anchor names an id its owner offers: an edge midpoint id, or
 * one the owner's type declares for it as it stands (see listConnectPointIds). Any other
 * anchor kind passes unchecked.
 *
 * @param doc - Searched but not modified; must already hold the owner as the end will see it
 * @param ownerId - The object the end attaches to, looked up through group children as well
 * @param anchor - The anchor about to be stored on that end
 * @param definitions - Type table the owner's `extraConnectPointIds` is read from; a type
 *   missing from it offers the edge midpoints only
 * @returns `anchor` unchanged, so the check reads as a step in building the endpoint
 * @throws {@link DocOperationError} naming the id, the owner and every id it offers when
 *   the owner does not offer the id, or when the owner is not in the doc
 */
export const requireOfferedConnectPoint = (
	doc: CanvasDoc,
	ownerId: string,
	anchor: OwnedEndpointRef["anchor"],
	definitions: DocDefinitions,
): OwnedEndpointRef["anchor"] => {
	if (anchor.kind !== "connectPoint" || isConnectPointId(anchor.id)) {
		return anchor;
	}
	const found = findObject(doc, ownerId);
	if (found === undefined) {
		throw new DocOperationError(`object not found: ${ownerId}`);
	}
	const offeredIds = listConnectPointIds(
		found.object,
		definitions.get(found.object.type) ?? {},
	);
	if (offeredIds.includes(anchor.id)) {
		return anchor;
	}
	throw new DocOperationError(
		`${JSON.stringify(anchor.id)} is not a connect point of "${ownerId}" (${found.object.type}); it offers ${describeOfferedConnectPointIds(offeredIds)}`,
	);
};

/**
 * Endpoint owned by `ownerId`, anchored where `anchorId` says (centre when omitted).
 *
 * @param doc - Searched but not modified, for the connect points the owner offers
 * @param definitions - Type table the owner's declared connect points are read from
 * @throws {@link DocOperationError} for an unusable edge handle (see {@link buildAnchor})
 *   or a connect point the owner does not offer (see {@link requireOfferedConnectPoint})
 */
export const buildEndpoint = (
	doc: CanvasDoc,
	ownerId: string,
	anchorId: AnchorHandleId | undefined,
	definitions: DocDefinitions,
): OwnedEndpointRef => ({
	owner: { id: ownerId },
	anchor: requireOfferedConnectPoint(
		doc,
		ownerId,
		buildAnchor(anchorId),
		definitions,
	),
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
 *   connector (see validateConnectorDoc), so it must never be written
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
