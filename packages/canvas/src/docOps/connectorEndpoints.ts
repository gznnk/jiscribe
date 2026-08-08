import { DocOperationError } from "./errors";
import { findObject } from "./objectAccess";
import type { DocDefinitions } from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type {
	ConnectPointId,
	EdgeAnchorSide,
	EdgeAnchorSpec,
	OwnedEndpointRef,
} from "../schemas/objects/types/EndpointRef";
import {
	EdgeAnchorSides,
	isEdgeAnchorSide,
} from "../schemas/objects/types/EndpointRef";

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
