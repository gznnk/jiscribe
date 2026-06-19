import { memo } from "react";

import { ConnectorRenderer } from "./ConnectorRenderer";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";

type ConnectorsRendererProps = Pick<CanvasState, "objects" | "connectorIds">;

const ConnectorsRendererComponent: React.FC<ConnectorsRendererProps> = ({
	objects,
	connectorIds,
}) => {
	return (
		<>
			{connectorIds.map((id) => {
				const connector = objects[id];
				if (!connector || connector.type !== "connector") {
					return null;
				}
				return (
					<ConnectorRenderer
						key={id}
						connectorState={connector as ConnectorState}
						objects={objects}
					/>
				);
			})}
		</>
	);
};

export const ConnectorsRenderer = memo(ConnectorsRendererComponent);
