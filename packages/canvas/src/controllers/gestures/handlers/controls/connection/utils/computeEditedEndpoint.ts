import { roundToDecimal, type Point } from "@jiscribe/geometry";

import {
	calcNearestAnchor,
	type AnchorExclusion,
	type AnchorSnapContext,
} from "./calcNearestAnchor";
import { PRECISION } from "../../../../../../constants/precision";
import {
	toEquivalentEdgeAnchor,
	type EndpointRef,
} from "../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../states/objects/connections/connector/ConnectorState";

/**
 * Pure function that returns a new ConnectorState with the connector's edited
 * endpoint updated according to the cursor position and the hovered target.
 * - If hoveredTarget exists, connect to its nearest anchor (OwnedEndpointRef).
 * - Otherwise use a FreeAnchor at the (rounded) cursor position.
 * The fixed endpoint and intermediate waypoints (points) are kept as-is.
 *
 * When the hover target is the same object as the fixed side (self-loop), the
 * fixed side's anchor and center are excluded from the candidates so the connector
 * always attaches somewhere else (prevents center-to-center / same-point
 * degeneration).
 *
 * Resolving the hover target and reading its geometry from the registries (both
 * depend on state.objects / the registries) is done by the caller; passing them in
 * already resolved keeps this function pure.
 *
 * @param baseConnector - The connector to derive the new state from; its fixed end
 *   and waypoints are carried over untouched
 * @param endpointToUpdate - Which end the cursor is dragging
 * @param cursor - The dragged end's position in world coordinates
 * @param hoveredTarget - The shape under the cursor, or null to land the end free
 * @param fixedEndpoint - The end that is not being dragged; read only to recognize
 *   a self-loop and to keep the dragged end off it
 * @param hoveredTargetContext - The hovered shape's outline / anchor region /
 *   declared points and the viewport zoom, which together decide how the cursor
 *   snaps; omitted = bounding-box geometry at zoom 1
 * @returns A new connector state with just the dragged end rewritten
 */
export function computeEditedEndpoint(
	baseConnector: ConnectorState,
	endpointToUpdate: "source" | "target",
	cursor: Point,
	hoveredTarget: { id: string; object: ObjectState } | null,
	fixedEndpoint?: EndpointRef,
	hoveredTargetContext?: AnchorSnapContext,
): ConnectorState {
	const isSelfLoop =
		hoveredTarget != null && fixedEndpoint?.owner?.id === hoveredTarget.id;
	const fixedAnchor = fixedEndpoint?.anchor;
	const exclude: AnchorExclusion | undefined = isSelfLoop
		? {
				center: true,
				connectPointId:
					fixedAnchor?.kind === "connectPoint" ? fixedAnchor.id : undefined,
				// An edge midpoint is also an edge position, so excluding it by id is not
				// enough: the free end has to be kept off the ratio it stands on too.
				edge: fixedAnchor
					? (toEquivalentEdgeAnchor(fixedAnchor) ?? undefined)
					: undefined,
			}
		: undefined;

	const editedEndpoint: EndpointRef = hoveredTarget
		? {
				owner: { id: hoveredTarget.id },
				anchor: calcNearestAnchor(
					hoveredTarget.object,
					cursor.x,
					cursor.y,
					exclude,
					hoveredTargetContext,
				),
			}
		: {
				anchor: {
					kind: "free",
					point: {
						x: roundToDecimal(cursor.x, PRECISION.COORDINATE),
						y: roundToDecimal(cursor.y, PRECISION.COORDINATE),
					},
				},
			};

	return {
		...baseConnector,
		source:
			endpointToUpdate === "source" ? editedEndpoint : baseConnector.source,
		target:
			endpointToUpdate === "target" ? editedEndpoint : baseConnector.target,
	} as ConnectorState;
}
