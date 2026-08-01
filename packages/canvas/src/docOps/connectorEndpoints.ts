import { DocOperationError } from "./errors";
import { findObject } from "./objectAccess";
import type { DocDefinitions } from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type {
	ConnectPointId,
	OwnedEndpointRef,
} from "../schemas/objects/types/EndpointRef";

/**
 * Selectable anchor position. "center" becomes a CenterAnchorSpec and an edge midpoint
 * becomes a connectPoint; "center" is never a connectPoint id.
 */
export type AnchorHandleId = "center" | ConnectPointId;

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

/** Anchor spec for a handle id; an omitted handle means the shape's centre. */
export const buildAnchor = (
	anchorId: AnchorHandleId | undefined,
): OwnedEndpointRef["anchor"] =>
	anchorId === undefined || anchorId === "center"
		? { kind: "center" }
		: { kind: "connectPoint", id: anchorId };

/** Endpoint owned by `ownerId`, anchored where `anchorId` says (centre when omitted). */
export const buildEndpoint = (
	ownerId: string,
	anchorId: AnchorHandleId | undefined,
): OwnedEndpointRef => ({
	owner: { id: ownerId },
	anchor: buildAnchor(anchorId),
});
