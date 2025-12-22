import type React from "react";
import { memo } from "react";

import { ConnectPoint } from "../ConnectPoint";
import type { ConnectPointsProps } from "./ConnectPointsTypes";

/**
 * Container component for rendering multiple connect points
 */
const ConnectPointsComponent: React.FC<ConnectPointsProps> = ({
	ownerId,
	ownerFrame,
	connectPoints,
	showConnectPoints,
	shouldRender,
	connectEnabled = true,
	connectType = "both",
	onConnect,
	onPreviewConnectLine,
}) => {
	if (!shouldRender) {
		return null;
	}

	if (connectEnabled === false) {
		return null;
	}

	return (
		<>
			{connectPoints.map((cp) => (
				<ConnectPoint
					key={cp.id}
					id={cp.id}
					name={cp.name}
					x={cp.x}
					y={cp.y}
					ownerId={ownerId}
					ownerFrame={ownerFrame}
					alwaysVisible={showConnectPoints}
					connectType={connectType}
					onConnect={onConnect}
					onPreviewConnectLine={onPreviewConnectLine}
				/>
			))}
		</>
	);
};

export const ConnectPoints = memo(ConnectPointsComponent);
