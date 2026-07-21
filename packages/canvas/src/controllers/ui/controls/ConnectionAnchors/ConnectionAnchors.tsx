import {
	calcFrameKeyPoints,
	calcNonZeroSign,
	calcOutlinePointTowardForPolygon,
	degreesToRadians,
} from "@workspace/geometry";
import type { Point, TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { theme } from "../../../../constants/theme";
import type { ConnectPointId } from "../../../../schemas/objects/types/EndpointRef";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";

// Anchor colors may hold var(--jiscribe-*), so they are applied via style
// (fill/stroke) rather than SVG presentation attributes.
const connectionAnchorStyle = {
	fill: theme.connectionAccent,
	stroke: theme.connectionAccent,
	cursor: "crosshair",
} as const;

type ConnectionAnchorsProps = {
	/**
	 * The object ID that owns these anchors.
	 */
	objectId: string;
	/**
	 * The frame (bounding box) to show connection anchors for.
	 */
	frame: TransformedFrame;
	/**
	 * The shape's local outline polygon (from ObjectOutlineRegistry). When present,
	 * the anchor dots sit on the true edge instead of the bounding box.
	 */
	outline?: readonly Point[] | null;
	/**
	 * Zoom level for adjusting handle sizes.
	 * @default 1
	 */
	zoom?: number;
};

/**
 * ConnectionAnchors component for canvas.
 *
 * Displays connection anchor points on the midpoints of each edge of a frame.
 * These anchors can be dragged to create new connectors.
 *
 * Each anchor has:
 * - data-kind="control" for GestureHandler to identify
 * - data-id=<objectId> + data-part="anchor:<anchorPosition>" for identifying which anchor was interacted with
 */
const ConnectionAnchorsComponent: React.FC<ConnectionAnchorsProps> = ({
	objectId,
	frame,
	outline,
	zoom = 1,
}) => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;
	const { handleDimensions } = useCanvasTheme();

	// Adjust sizes based on zoom level to maintain consistent visual size
	const adjustedAnchorRadius = handleDimensions.anchorRadius / zoom;
	const adjustedStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;
	const adjustedOffset = handleDimensions.connectionAnchorOffset / zoom;

	// Calculate all feature points (corners and edge midpoints)
	const points = calcFrameKeyPoints({
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	// With an outline, move each anchor from the bounding-box edge midpoint onto
	// the true edge (ray from center toward that midpoint). Rect/no-outline keep
	// the midpoint. The outward-normal offset below is applied on top either way.
	const edgePoint = (boxMidpoint: Point): Point =>
		outline && outline.length >= 2
			? (calcOutlinePointTowardForPolygon(outline, frame, boxMidpoint) ??
				boxMidpoint)
			: boxMidpoint;

	const topEdge = edgePoint(points.topCenter);
	const rightEdge = edgePoint(points.rightCenter);
	const bottomEdge = edgePoint(points.bottomCenter);
	const leftEdge = edgePoint(points.leftCenter);

	const radians = degreesToRadians(rotation);

	// Calculate anchor positions with offset in the outward normal direction.
	// Math.sign(scaleX/scaleY) corrects the direction when the frame is flipped:
	// - Top/Bottom normals flip with scaleY (scaleY=-1 makes topCenter appear at bottom)
	// - Left/Right normals flip with scaleX (scaleX=-1 makes rightCenter appear at left)
	const signX = calcNonZeroSign(scaleX);
	const signY = calcNonZeroSign(scaleY);

	const topCenterAnchor = {
		x: topEdge.x + signY * Math.sin(radians) * adjustedOffset,
		y: topEdge.y - signY * Math.cos(radians) * adjustedOffset,
	};

	const rightCenterAnchor = {
		x: rightEdge.x + signX * Math.cos(radians) * adjustedOffset,
		y: rightEdge.y + signX * Math.sin(radians) * adjustedOffset,
	};

	const bottomCenterAnchor = {
		x: bottomEdge.x - signY * Math.sin(radians) * adjustedOffset,
		y: bottomEdge.y + signY * Math.cos(radians) * adjustedOffset,
	};

	const leftCenterAnchor = {
		x: leftEdge.x - signX * Math.cos(radians) * adjustedOffset,
		y: leftEdge.y - signX * Math.sin(radians) * adjustedOffset,
	};

	const anchors: Array<{
		position: ConnectPointId;
		point: { x: number; y: number };
	}> = [
		// { position: "center", point: { x: cx, y: cy } },
		{ position: "topCenter", point: topCenterAnchor },
		{ position: "rightCenter", point: rightCenterAnchor },
		{ position: "bottomCenter", point: bottomCenterAnchor },
		{ position: "leftCenter", point: leftCenterAnchor },
	];

	return (
		<g data-layer="connection-anchors">
			{anchors.map(({ position, point }) => (
				<circle
					key={position}
					cx={point.x}
					cy={point.y}
					r={adjustedAnchorRadius}
					strokeWidth={adjustedStrokeWidth}
					data-kind="control"
					data-id={objectId}
					data-part={`anchor:${position}`}
					style={connectionAnchorStyle}
				/>
			))}
		</g>
	);
};

export const ConnectionAnchors = memo(ConnectionAnchorsComponent);
