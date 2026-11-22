import type { Point } from "@jiscribe/geometry";

import type { ObjectRecord } from "./objectAccess";
import { calcObjectTransformedFrame } from "./objectFrame";
import type { DocDefinitions } from "./objectGeometry";
import type { ConnectorDoc } from "../../model/objects/connector/ConnectorDoc";
import type { EndpointOwnerShape } from "../../model/objects/connector/EndpointOwner";
import {
	resolveConnectorEnds,
	resolveStoredConnectorWaypoints,
} from "../../model/objects/connector/resolveConnectorEnds";
import {
	type EndpointRef,
	isConnectPointId,
	isOwnedEndpointRef,
} from "../../model/objects/types/EndpointRef";
import { listConnectPointIds } from "../../plugin/listConnectPointIds";

/**
 * One end's owner as the path resolution takes it, or null where it cannot be
 * resolved here: a missing owner, a type the table does not know, an owner with
 * no frame, or an end on a connect point the owner's type declares — whose
 * position only the type's presentation knows.
 */
const readDocEndpointOwnerShape = (
	endpoint: EndpointRef,
	owner: ObjectRecord | undefined,
	definitions: DocDefinitions,
): EndpointOwnerShape | null => {
	if (!isOwnedEndpointRef(endpoint)) {
		return { owner: null };
	}
	if (owner === undefined) {
		return null;
	}
	const definition = definitions.get(owner.type);
	if (definition === undefined) {
		return null;
	}
	const { anchor } = endpoint;
	if (
		anchor.kind === "connectPoint" &&
		!isConnectPointId(anchor.id) &&
		listConnectPointIds(owner, definition).includes(anchor.id)
	) {
		return null;
	}
	const frame = calcObjectTransformedFrame(owner, definitions);
	if (frame === null) {
		return null;
	}
	// The type's declarations read the doc at the size it is drawn, which a doc
	// storing no height leaves to the text.
	const box = { ...owner, width: frame.width, height: frame.height };
	return {
		owner: { ...frame, features: definition.features },
		outline: definition.outline?.(box),
		anchorRegion: definition.anchorRegion?.(box),
	};
};

/**
 * The path a connector with stored vertices is drawn along, resolved from the
 * document alone by the same steps the canvas draws it with
 * (resolveConnectorEnds, resolveStoredConnectorWaypoints): each end anchored on
 * its owner's frame (calcObjectTransformedFrame) and the outline and anchor
 * region its type declares, the vertices next to the ends aligned to them on a
 * right-angled line.
 *
 * A shape storing no `height` is measured at the height its text needs, so the
 * host must have offered a text measurement first (in `@jiscribe/doc-tools`,
 * `offerNodeTextMeasurement()`), or this throws.
 *
 * @param connector - The connector; only its ends, `routing` and `points` are read
 * @param sourceOwner - The object the source end names, found by its id anywhere in the tree (group children included); undefined for a free end or a missing owner
 * @param targetOwner - The object the target end names, likewise
 * @param definitions - Type table each owner's `features`, box declaration, `outline`, `anchorRegion` and declared connect point ids are read from
 * @returns The drawn points in world coordinates — source, the vertices, target —
 *   with points closer than the drawing tells apart not yet collapsed
 *   (resolveArrowHeadPath); null for a connector with no stored vertices (its route is
 *   chosen on the canvas), an owned end whose owner is missing, of a type the
 *   table does not know or without a frame, an end on a connect point its
 *   owner's type declares, and an end that does not resolve. A connect point id
 *   the owner offers in no way resolves to the owner's center, as on the canvas
 */
export const resolveConnectorDocPath = (
	connector: Pick<ConnectorDoc, "source" | "target" | "routing" | "points">,
	sourceOwner: ObjectRecord | undefined,
	targetOwner: ObjectRecord | undefined,
	definitions: DocDefinitions,
): Point[] | null => {
	if (connector.points === undefined || connector.points.length === 0) {
		return null;
	}
	const sourceShape = readDocEndpointOwnerShape(
		connector.source,
		sourceOwner,
		definitions,
	);
	const targetShape = readDocEndpointOwnerShape(
		connector.target,
		targetOwner,
		definitions,
	);
	if (sourceShape === null || targetShape === null) {
		return null;
	}
	const ends = resolveConnectorEnds(connector, sourceShape, targetShape);
	if (ends === null) {
		return null;
	}
	const waypoints = resolveStoredConnectorWaypoints(
		connector,
		ends,
		sourceShape,
		targetShape,
	);
	if (waypoints === null) {
		return null;
	}
	return [ends.source, ...waypoints, ends.target];
};
