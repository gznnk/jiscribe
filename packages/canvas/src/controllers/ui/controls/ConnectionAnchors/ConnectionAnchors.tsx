import {
	calcFrameKeyPoints,
	calcNonZeroSign,
	degreesToRadians,
} from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ConnectPointId } from "../../../../schemas/objects/types/EndpointRef";

const ANCHOR_RADIUS = 4;
const ANCHOR_STROKE_WIDTH = 1;
const ANCHOR_COLOR = "#6366f1";
const ANCHOR_FILL = "#6366f1";
const ANCHOR_OFFSET = 20; // Distance from the edge

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
 * ConnectionAnchors component for canvas.
 *
 * Displays connection anchor points on the midpoints of each edge of a frame.
 * These anchors can be dragged to create new connectors.
 *
 * Each anchor has:
 * - data-kind="control" for GestureHandler to identify
 * - data-id="connection-anchor:create:<objectId>:<anchorPosition>" for identifying which anchor was interacted with
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

	// Calculate anchor positions with offset in the outward normal direction.
	// Math.sign(scaleX/scaleY) corrects the direction when the frame is flipped:
	// - Top/Bottom normals flip with scaleY (scaleY=-1 makes topCenter appear at bottom)
	// - Left/Right normals flip with scaleX (scaleX=-1 makes rightCenter appear at left)
	const signX = calcNonZeroSign(scaleX);
	const signY = calcNonZeroSign(scaleY);

	const topCenterAnchor = {
		x: points.topCenter.x + signY * Math.sin(radians) * adjustedOffset,
		y: points.topCenter.y - signY * Math.cos(radians) * adjustedOffset,
	};

	const rightCenterAnchor = {
		x: points.rightCenter.x + signX * Math.cos(radians) * adjustedOffset,
		y: points.rightCenter.y + signX * Math.sin(radians) * adjustedOffset,
	};

	const bottomCenterAnchor = {
		x: points.bottomCenter.x - signY * Math.sin(radians) * adjustedOffset,
		y: points.bottomCenter.y + signY * Math.cos(radians) * adjustedOffset,
	};

	const leftCenterAnchor = {
		x: points.leftCenter.x - signX * Math.cos(radians) * adjustedOffset,
		y: points.leftCenter.y - signX * Math.sin(radians) * adjustedOffset,
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
					fill={ANCHOR_FILL}
					stroke={ANCHOR_COLOR}
					strokeWidth={adjustedStrokeWidth}
					data-kind="control"
					data-id={`connection-anchor:create:${objectId}:${position}`}
					style={{ cursor: "crosshair" }}
				/>
			))}
		</g>
	);
};

export const ConnectionAnchors = memo(ConnectionAnchorsComponent);
