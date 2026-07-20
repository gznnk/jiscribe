import {
	calcFrameKeyPoints,
	calcOutlinePointTowardForPolygon,
} from "@workspace/geometry";
import type { Point, TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { theme } from "../../../../constants/theme";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import type { AnchorHandleId } from "../ConnectionAnchorTypes";

type ConnectionTargetAnchorsProps = {
	/**
	 * The frame (bounding box) of the target object.
	 */
	frame: TransformedFrame;
	/**
	 * The shape's local outline polygon (from OutlineRegistry). When present,
	 * the edge anchors sit on the true edge instead of the bounding box.
	 */
	outline?: readonly Point[] | null;
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
 * center + four edge midpoints.
 *
 * The point nearest to the cursor (already computed by
 * ConnectionAnchorEventHandler) is visually highlighted.
 * This is purely visual — no pointer events.
 */
const ConnectionTargetAnchorsComponent: React.FC<
	ConnectionTargetAnchorsProps
> = ({ frame, outline, activeAnchorId, zoom = 1 }) => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;
	const { handleDimensions } = useCanvasTheme();

	const adjustedRadius = handleDimensions.anchorRadius / zoom;
	const adjustedStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;

	const points = calcFrameKeyPoints({
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	// With an outline, place edge anchors on the true edge (ray from center toward
	// the bounding-box edge midpoint); rect/no-outline keep the midpoint.
	const edgePoint = (boxMidpoint: Point): Point =>
		outline && outline.length >= 2
			? (calcOutlinePointTowardForPolygon(outline, frame, boxMidpoint) ??
				boxMidpoint)
			: boxMidpoint;

	const top = edgePoint(points.topCenter);
	const right = edgePoint(points.rightCenter);
	const bottom = edgePoint(points.bottomCenter);
	const left = edgePoint(points.leftCenter);

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
