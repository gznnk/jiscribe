import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { isConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";

type ConnectorPointsDebugOverlayProps = {
	objects: Record<string, ObjectState>;
	zoom: number;
};

/** Debug-only color, deliberately absent from the app palette so the markers read as foreign. */
const MARKER_COLOR = "#e040fb";

/**
 * Debug markers showing where each connector's **stored** vertices (`points`) actually are.
 *
 * The drawn route is not always the stored one: rendering re-aligns the vertices next to the
 * endpoints every frame (see alignVertexPath), so the two diverge while a connected shape is
 * mid-operation — until the commit writes the aligned list back (see reconcileConnectorVertices) —
 * and stay diverged for stored lists the editor never committed (AI-written docs). This overlay
 * draws the raw list — a dot per stored vertex, its index in `points`, and a dashed line joining
 * them in source → target order — so that divergence is visible instead of inferred.
 *
 * Not mounted by default like (DebugInfo): when verifying vertex semantics by hand, mount it
 * inside CanvasView after the guides. Sizes are zoom-compensated so the markers stay readable at
 * any zoom.
 */
const ConnectorPointsDebugOverlayComponent: React.FC<
	ConnectorPointsDebugOverlayProps
> = ({ objects, zoom }) => {
	const shapedConnectors = Object.values(objects).filter(
		(object) => isConnectorState(object) && object.points.length > 0,
	);

	return (
		<>
			{shapedConnectors.map((connector) => {
				if (!isConnectorState(connector)) {
					return null;
				}
				return (
					<g key={connector.id} pointerEvents="none">
						{connector.points.length >= 2 && (
							<polyline
								points={connector.points
									.map((point) => `${point.x},${point.y}`)
									.join(" ")}
								fill="none"
								stroke={MARKER_COLOR}
								strokeWidth={1 / zoom}
								strokeDasharray={`${4 / zoom},${3 / zoom}`}
							/>
						)}
						{connector.points.map((point, index) => (
							<g key={index}>
								<circle
									cx={point.x}
									cy={point.y}
									r={3.5 / zoom}
									fill={MARKER_COLOR}
								/>
								<text
									x={point.x + 6 / zoom}
									y={point.y - 6 / zoom}
									fontSize={10 / zoom}
									fill={MARKER_COLOR}
								>
									{index}
								</text>
							</g>
						))}
					</g>
				);
			})}
		</>
	);
};

export const ConnectorPointsDebugOverlay = memo(
	ConnectorPointsDebugOverlayComponent,
);
