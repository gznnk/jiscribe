import {
	calcFrameKeyPoints,
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { RotateRight } from "../../icons/RotateRight";

const ANCHOR_RADIUS = 4;
const ANCHOR_STROKE_WIDTH = 1;
const ANCHOR_COLOR = "#0d99ff";
const ANCHOR_FILL = "white";
const ROTATION_HANDLE_OFFSET = 15;
const ROTATION_ICON_SIZE = 20;
const ROTATION_HIT_RADIUS = 7;

type TransformControlsProps = {
	/**
	 * The frame (bounding box) to show controls for.
	 */
	frame: TransformedFrame;
	/**
	 * Whether to show rotation controls.
	 * @default true
	 */
	showRotation?: boolean;
	/**
	 * Whether to show edge (mid-point) resize handles.
	 * @default true
	 */
	showEdgeHandles?: boolean;
	/**
	 * Zoom level for adjusting handle sizes.
	 * @default 1
	 */
	zoom?: number;
};

/**
 * TransformControls component for svg-canvas-2.
 *
 * This is a pure presentation component that renders visual transform handles.
 * All interaction logic should be handled by the GestureHandler.
 *
 * Each anchor has:
 * - data-kind="control" for GestureHandler to identify
 * - data-id="transform-control:<anchorType>" for identifying which anchor was interacted with
 */
const TransformControlsComponent: React.FC<TransformControlsProps> = ({
	frame,
	showRotation = true,
	showEdgeHandles = true,
	zoom = 1,
}) => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;

	// Adjust sizes based on zoom level to maintain consistent visual size
	const scale = 1 / zoom;
	const adjustedAnchorRadius = ANCHOR_RADIUS / zoom;
	const adjustedStrokeWidth = ANCHOR_STROKE_WIDTH / zoom;
	const adjustedRotationOffset = ROTATION_HANDLE_OFFSET / zoom;
	const adjustedRotationHitRadius = ROTATION_HIT_RADIUS / zoom;

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

	// Rotation handle position (top-right corner with offset)
	const radians = degreesToRadians(rotation);
	const rotationPoint = calcAffineTransformedPoint(
		width / 2 + adjustedRotationOffset,
		-(height / 2 + adjustedRotationOffset),
		1,
		1,
		radians,
		cx,
		cy,
	);

	return (
		<g>
			{/* Bounding box outline */}
			<rect
				x={cx - width / 2}
				y={cy - height / 2}
				width={width}
				height={height}
				fill="none"
				stroke={ANCHOR_COLOR}
				strokeWidth={adjustedStrokeWidth}
				transform={`rotate(${rotation} ${cx} ${cy})`}
				pointerEvents="none"
			/>

			{/* Corner anchors */}
			<circle
				cx={points.topLeft.x}
				cy={points.topLeft.y}
				r={adjustedAnchorRadius}
				fill={ANCHOR_FILL}
				stroke={ANCHOR_COLOR}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform-control:topLeft"
				style={{ cursor: "nwse-resize" }}
			/>
			<circle
				cx={points.topRight.x}
				cy={points.topRight.y}
				r={adjustedAnchorRadius}
				fill={ANCHOR_FILL}
				stroke={ANCHOR_COLOR}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform-control:topRight"
				style={{ cursor: "nesw-resize" }}
			/>
			<circle
				cx={points.bottomLeft.x}
				cy={points.bottomLeft.y}
				r={adjustedAnchorRadius}
				fill={ANCHOR_FILL}
				stroke={ANCHOR_COLOR}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform-control:bottomLeft"
				style={{ cursor: "nesw-resize" }}
			/>
			<circle
				cx={points.bottomRight.x}
				cy={points.bottomRight.y}
				r={adjustedAnchorRadius}
				fill={ANCHOR_FILL}
				stroke={ANCHOR_COLOR}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform-control:bottomRight"
				style={{ cursor: "nwse-resize" }}
			/>

			{/* Edge midpoint anchors */}
			{showEdgeHandles && (
				<>
					<circle
						cx={points.topCenter.x}
						cy={points.topCenter.y}
						r={adjustedAnchorRadius}
						fill={ANCHOR_FILL}
						stroke={ANCHOR_COLOR}
						strokeWidth={adjustedStrokeWidth}
						data-kind="control"
						data-id="transform-control:topCenter"
						style={{ cursor: "ns-resize" }}
					/>
					<circle
						cx={points.rightCenter.x}
						cy={points.rightCenter.y}
						r={adjustedAnchorRadius}
						fill={ANCHOR_FILL}
						stroke={ANCHOR_COLOR}
						strokeWidth={adjustedStrokeWidth}
						data-kind="control"
						data-id="transform-control:rightCenter"
						style={{ cursor: "ew-resize" }}
					/>
					<circle
						cx={points.bottomCenter.x}
						cy={points.bottomCenter.y}
						r={adjustedAnchorRadius}
						fill={ANCHOR_FILL}
						stroke={ANCHOR_COLOR}
						strokeWidth={adjustedStrokeWidth}
						data-kind="control"
						data-id="transform-control:bottomCenter"
						style={{ cursor: "ns-resize" }}
					/>
					<circle
						cx={points.leftCenter.x}
						cy={points.leftCenter.y}
						r={adjustedAnchorRadius}
						fill={ANCHOR_FILL}
						stroke={ANCHOR_COLOR}
						strokeWidth={adjustedStrokeWidth}
						data-kind="control"
						data-id="transform-control:leftCenter"
						style={{ cursor: "ew-resize" }}
					/>
				</>
			)}

			{/* Rotation handle */}
			{showRotation && (
				<>
					<g
						transform={`translate(${rotationPoint.x} ${rotationPoint.y}) rotate(${rotation}) scale(${scale}) translate(${-ROTATION_ICON_SIZE / 2} ${-ROTATION_ICON_SIZE / 2})`}
					>
						<RotateRight
							width={ROTATION_ICON_SIZE}
							height={ROTATION_ICON_SIZE}
						/>
					</g>
					<circle
						cx={rotationPoint.x}
						cy={rotationPoint.y}
						r={adjustedRotationHitRadius}
						fill="transparent"
						data-kind="control"
						data-id="transform-control:rotation"
						style={{ cursor: "grab" }}
					/>
				</>
			)}
		</g>
	);
};

export const TransformControls = memo(TransformControlsComponent);
