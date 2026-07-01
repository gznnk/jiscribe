import { roundToDecimal, type Point } from "@workspace/geometry";

import { calcNearestAnchor } from "./calcNearestAnchor";
import { PRECISION } from "../../../../../../constants/precision";
import type { EndpointRef } from "../../../../../../schemas/objects/types/EndpointRef";
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
 * always attaches to a different edge midpoint (prevents center-to-center / same-edge
 * degeneration).
 *
 * Resolving the hover target (which depends on state.objects / registry) is done by
 * the caller; passing the already-resolved hoveredTarget keeps this function pure.
 */
export function computeEditedEndpoint(
	baseConnector: ConnectorState,
	endpointToUpdate: "source" | "target",
	cursor: Point,
	hoveredTarget: { id: string; object: ObjectState } | null,
	fixedEndpoint?: EndpointRef,
): ConnectorState {
	const isSelfLoop =
		hoveredTarget != null && fixedEndpoint?.owner?.id === hoveredTarget.id;
	const exclude = isSelfLoop
		? {
				center: true,
				connectPointId:
					fixedEndpoint?.anchor.kind === "connectPoint"
						? fixedEndpoint.anchor.id
						: undefined,
			}
		: undefined;

	const editedEndpoint: EndpointRef = hoveredTarget
		? {
				owner: {
					type: hoveredTarget.object.type,
					id: hoveredTarget.id,
				},
				anchor: calcNearestAnchor(
					hoveredTarget.object,
					cursor.x,
					cursor.y,
					exclude,
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
