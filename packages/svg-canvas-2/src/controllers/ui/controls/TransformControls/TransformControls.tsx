import {
	calcFrameKeyPoints,
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { RotateRight } from "../../icons/RotateRight";
import { getResizeCursorForRotation } from "../../utils/getResizeCursorForRotation";

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
 * This component renders visual transform handles for the selected object.
 * All interaction logic is handled by the GestureHandler via data attributes.
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

	// Get cursors based on rotation angle and scale
	const cursors = {
		topLeft: getResizeCursorForRotation(225, rotation, scaleX, scaleY),
		topCenter: getResizeCursorForRotation(-90, rotation, scaleX, scaleY),
		topRight: getResizeCursorForRotation(-45, rotation, scaleX, scaleY),
		rightCenter: getResizeCursorForRotation(0, rotation, scaleX, scaleY),
		bottomRight: getResizeCursorForRotation(45, rotation, scaleX, scaleY),
		bottomCenter: getResizeCursorForRotation(90, rotation, scaleX, scaleY),
		bottomLeft: getResizeCursorForRotation(135, rotation, scaleX, scaleY),
		leftCenter: getResizeCursorForRotation(180, rotation, scaleX, scaleY),
	};

	return (
		<g>
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
				style={{ cursor: cursors.topLeft }}
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
				style={{ cursor: cursors.topRight }}
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
				style={{ cursor: cursors.bottomLeft }}
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
				style={{ cursor: cursors.bottomRight }}
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
						style={{ cursor: cursors.topCenter }}
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
						style={{ cursor: cursors.rightCenter }}
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
						style={{ cursor: cursors.bottomCenter }}
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
						style={{ cursor: cursors.leftCenter }}
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
