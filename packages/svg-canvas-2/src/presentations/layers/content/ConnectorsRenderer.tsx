import { memo } from "react";

import { adjustToOutline } from "./utils/adjustToOutline";
import { resolveEndpoint } from "./utils/resolveEndpoint";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../states/objects/connections/ConnectorState";
import { Connector } from "../../objects/connections/Connector";

type ConnectorsRendererProps = Pick<CanvasState, "objects" | "connectorIds">;

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
				if (connectorState.source.anchor.kind === "center") {
					sourcePoint = adjustToOutline(
						connectorState.source,
						sourcePoint,
						targetPoint,
						objects,
					);
					// Skip rendering if adjusted point is null (toward point is inside the shape)
					if (!sourcePoint) return null;
				}
				if (connectorState.target.anchor.kind === "center") {
					targetPoint = adjustToOutline(
						connectorState.target,
						targetPoint,
						sourcePoint,
						objects,
					);
					// Skip rendering if adjusted point is null (toward point is inside the shape)
					if (!targetPoint) return null;
				}

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
