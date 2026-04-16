import { calcFrameKeyPoints } from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ConnectPointId } from "../../../../schemas/objects/types/EndpointRef";

const TARGET_RADIUS = 5;
const TARGET_STROKE_WIDTH = 1.5;
const TARGET_COLOR = "#6366f1"; // indigo-500
const TARGET_FILL = "white";

export type { ConnectPointId };

type ConnectionTargetAnchorsProps = {
	/**
	 * The frame (bounding box) of the target object.
	 */
	frame: TransformedFrame;
	/**
	 * The anchor that is currently nearest to the cursor.
	 * null means no specific anchor is highlighted.
	 */
	activeAnchorId: ConnectPointId | null;
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
> = ({ frame, activeAnchorId, zoom = 1 }) => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;

	const adjustedRadius = TARGET_RADIUS / zoom;
	const adjustedStrokeWidth = TARGET_STROKE_WIDTH / zoom;

	const points = calcFrameKeyPoints({
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	const anchors: Array<{ id: ConnectPointId; x: number; y: number }> = [
		{ id: "center", x: cx, y: cy },
		{ id: "topCenter", x: points.topCenter.x, y: points.topCenter.y },
		{ id: "rightCenter", x: points.rightCenter.x, y: points.rightCenter.y },
		{ id: "bottomCenter", x: points.bottomCenter.x, y: points.bottomCenter.y },
		{ id: "leftCenter", x: points.leftCenter.x, y: points.leftCenter.y },
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
						r={isActive ? adjustedRadius * 1.4 : adjustedRadius}
						fill={isActive ? TARGET_COLOR : TARGET_FILL}
						stroke={TARGET_COLOR}
						strokeWidth={adjustedStrokeWidth}
					/>
				);
			})}
		</g>
	);
};

export const ConnectionTargetAnchors = memo(ConnectionTargetAnchorsComponent);
