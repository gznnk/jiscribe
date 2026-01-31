import {
	calcOutlinePointTowardForRotatedFrame,
	isCenterPoint,
	type Point,
	type TransformedFrame,
} from "@workspace/geometry";
import { memo } from "react";

import { resolveEndpoint } from "./utils/resolveEndpoint";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../states/objects/connections/ConnectorState";
import { Connector } from "../../objects/connections/Connector";

type ConnectorsRendererProps = Pick<CanvasState, "objects" | "connectorIds">;

/**
 * Adjusts an endpoint to the outline if it's a center anchor on a rect object.
 */
const adjustToOutline = (
	endpoint: ConnectorState["source"] | ConnectorState["target"],
	point: Point,
	toward: Point,
	objects: Record<string, unknown>,
): Point => {
	// Only adjust if it's a center anchor
	if (endpoint.anchor.kind !== "center" || !endpoint.owner) {
		return point;
	}

	const obj = objects[endpoint.owner.id];
	if (!obj || typeof obj !== "object" || !("type" in obj)) {
		return point;
	}

	// Only adjust for rect objects
	if (obj.type !== "rect") {
		return point;
	}

	// Validate that the object has required properties for TransformedFrame
	if (
		isCenterPoint(obj) &&
		"width" in obj &&
		"height" in obj &&
		"rotation" in obj &&
		"scaleX" in obj &&
		"scaleY" in obj &&
		typeof obj.width === "number" &&
		typeof obj.height === "number" &&
		typeof obj.rotation === "number" &&
		typeof obj.scaleX === "number" &&
		typeof obj.scaleY === "number"
	) {
		const frame: TransformedFrame = {
			cx: obj.cx,
			cy: obj.cy,
			width: obj.width,
			height: obj.height,
			rotation: obj.rotation,
			scaleX: obj.scaleX,
			scaleY: obj.scaleY,
		};

		return calcOutlinePointTowardForRotatedFrame(frame, toward);
	}

	return point;
};

const ConnectorsRendererComponent: React.FC<ConnectorsRendererProps> = ({
	objects,
	connectorIds,
}) => {
	return (
		<>
			{connectorIds.map((id) => {
				const connector = objects[id];
				if (!connector || connector.type !== "connector") return null;

				const connectorState = connector as ConnectorState;

				// Resolve endpoints to actual coordinates
				let sourcePoint = resolveEndpoint(connectorState.source, objects);
				let targetPoint = resolveEndpoint(connectorState.target, objects);

				// Skip rendering if endpoints cannot be resolved
				if (!sourcePoint || !targetPoint) return null;

				// Adjust to outline for center anchors on rect objects
				sourcePoint = adjustToOutline(
					connectorState.source,
					sourcePoint,
					targetPoint,
					objects,
				);
				targetPoint = adjustToOutline(
					connectorState.target,
					targetPoint,
					sourcePoint,
					objects,
				);

				return (
					<Connector
						key={id}
						id={connectorState.id}
						sourceX={sourcePoint.x}
						sourceY={sourcePoint.y}
						targetX={targetPoint.x}
						targetY={targetPoint.y}
						stroke={connectorState.stroke}
						strokeWidth={connectorState.strokeWidth}
						startArrow={connectorState.startArrow}
						endArrow={connectorState.endArrow}
					/>
				);
			})}
		</>
	);
};

export const ConnectorsRenderer = memo(ConnectorsRendererComponent);
