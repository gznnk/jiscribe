import { calcFrameKeyPoints, degreesToRadians } from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

const ANCHOR_RADIUS = 5;
const ANCHOR_STROKE_WIDTH = 1.5;
const ANCHOR_COLOR = "#10b981"; // emerald-500
const ANCHOR_FILL = "white";
const ANCHOR_OFFSET = 20; // Distance from the edge

type AnchorPosition =
	| "topCenter"
	| "rightCenter"
	| "bottomCenter"
	| "leftCenter";

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
	 * Zoom level for adjusting handle sizes.
	 * @default 1
	 */
	zoom?: number;
};

/**
 * ConnectionAnchors component for svg-canvas-2.
 *
 * Displays connection anchor points on the midpoints of each edge of a frame.
 * These anchors can be dragged to create new connectors.
 *
 * Each anchor has:
 * - data-kind="connection-anchor" for GestureHandler to identify
 * - data-id="<objectId>:<anchorPosition>" for identifying which anchor was interacted with
 */
const ConnectionAnchorsComponent: React.FC<ConnectionAnchorsProps> = ({
	objectId,
	frame,
	zoom = 1,
}) => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;

	// Adjust sizes based on zoom level to maintain consistent visual size
	const adjustedAnchorRadius = ANCHOR_RADIUS / zoom;
	const adjustedStrokeWidth = ANCHOR_STROKE_WIDTH / zoom;
	const adjustedOffset = ANCHOR_OFFSET / zoom;

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

	const radians = degreesToRadians(rotation);

	// Calculate anchor positions with offset in the normal direction
	// For topCenter: offset upward (negative y direction in local space)
	const topCenterAnchor = {
		x: points.topCenter.x + Math.sin(radians) * adjustedOffset,
		y: points.topCenter.y - Math.cos(radians) * adjustedOffset,
	};

	// For rightCenter: offset rightward (positive x direction in local space)
	const rightCenterAnchor = {
		x: points.rightCenter.x + Math.cos(radians) * adjustedOffset,
		y: points.rightCenter.y + Math.sin(radians) * adjustedOffset,
	};

	// For bottomCenter: offset downward (positive y direction in local space)
	const bottomCenterAnchor = {
		x: points.bottomCenter.x - Math.sin(radians) * adjustedOffset,
		y: points.bottomCenter.y + Math.cos(radians) * adjustedOffset,
	};

	// For leftCenter: offset leftward (negative x direction in local space)
	const leftCenterAnchor = {
		x: points.leftCenter.x - Math.cos(radians) * adjustedOffset,
		y: points.leftCenter.y - Math.sin(radians) * adjustedOffset,
	};

	const anchors: Array<{
		position: AnchorPosition;
		point: { x: number; y: number };
	}> = [
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
					fill={ANCHOR_FILL}
					stroke={ANCHOR_COLOR}
					strokeWidth={adjustedStrokeWidth}
					data-kind="connection-anchor"
					data-id={`${objectId}:${position}`}
					style={{ cursor: "crosshair" }}
				/>
			))}
		</g>
	);
};

export const ConnectionAnchors = memo(ConnectionAnchorsComponent);
