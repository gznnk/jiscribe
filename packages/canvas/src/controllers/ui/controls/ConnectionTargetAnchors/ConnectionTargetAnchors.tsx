import { calcFrameKeyPoints } from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";
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
> = ({ frame, activeAnchorId, zoom = 1 }) => {
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

	const anchors: Array<{ id: AnchorHandleId; x: number; y: number }> = [
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
