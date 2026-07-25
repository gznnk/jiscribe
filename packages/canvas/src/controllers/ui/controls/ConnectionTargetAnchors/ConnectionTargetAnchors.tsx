import type { Point, Rect, TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { theme } from "../../../../constants/theme";
import { calcConnectPoint } from "../../../../presentations/objects/utils/calcConnectPoint";
import type { ConnectPointId } from "../../../../schemas/objects/types/EndpointRef";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import type { AnchorHandleId } from "../ConnectionAnchorTypes";

type ConnectionTargetAnchorsProps = {
	/**
	 * The frame (bounding box) of the target object.
	 */
	frame: TransformedFrame;
	/**
	 * The shape's local outline polygon (from ObjectOutlineRegistry). When present,
	 * the edge anchors sit on the true edge instead of the bounding box.
	 */
	outline?: readonly Point[] | null;
	/**
	 * The shape's local anchor region (from ObjectAnchorRegionRegistry). When present,
	 * the edge anchors are centered on that band instead of the bounding box.
	 */
	anchorRegion?: Rect | null;
	/**
	 * The anchor that is currently nearest to the cursor.
	 * null means no specific anchor is highlighted.
	 */
	activeAnchorId: AnchorHandleId | null;
	/**
	 * Zoom level for adjusting handle sizes.
	 * @default 1
	 */
	zoom?: number;
};

/**
 * ConnectionTargetAnchors component.
 *
 * When a connection drag is in progress and the cursor hovers over a valid
 * target object, this component renders the connectable points on that object:
 * center + the four edge anchors (see calcConnectPoint).
 *
 * The point nearest to the cursor (already computed by
 * ConnectionAnchorEventHandler) is visually highlighted.
 * This is purely visual — no pointer events.
 */
const ConnectionTargetAnchorsComponent: React.FC<
	ConnectionTargetAnchorsProps
> = ({ frame, outline, anchorRegion, activeAnchorId, zoom = 1 }) => {
	const { cx, cy } = frame;
	const { handleDimensions } = useCanvasTheme();

	const adjustedRadius = handleDimensions.anchorRadius / zoom;
	const adjustedStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;

	// Edge anchors sit where a connector would attach (outline + anchor region aware).
	const edgePoint = (connectPointId: ConnectPointId): Point =>
		calcConnectPoint(frame, connectPointId, outline, anchorRegion);

	const top = edgePoint("topCenter");
	const right = edgePoint("rightCenter");
	const bottom = edgePoint("bottomCenter");
	const left = edgePoint("leftCenter");

	const anchors: Array<{ id: AnchorHandleId; x: number; y: number }> = [
		{ id: "center", x: cx, y: cy },
		{ id: "topCenter", x: top.x, y: top.y },
		{ id: "rightCenter", x: right.x, y: right.y },
		{ id: "bottomCenter", x: bottom.x, y: bottom.y },
		{ id: "leftCenter", x: left.x, y: left.y },
	];

	return (
		<g data-layer="connection-target-anchors" style={{ pointerEvents: "none" }}>
			{anchors.map(({ id, x, y }) => {
				const isActive = id === activeAnchorId;
				return (
					<circle
						key={id}
						cx={x}
						cy={y}
						r={isActive ? adjustedRadius * 1.2 : adjustedRadius}
						strokeWidth={adjustedStrokeWidth}
						// Colors may hold var(--jiscribe-*), so they are applied via style
						// rather than SVG presentation attributes.
						style={{
							fill: isActive ? theme.connectionAccent : theme.handleFill,
							stroke: theme.connectionAccent,
						}}
					/>
				);
			})}
		</g>
	);
};

export const ConnectionTargetAnchors = memo(ConnectionTargetAnchorsComponent);
