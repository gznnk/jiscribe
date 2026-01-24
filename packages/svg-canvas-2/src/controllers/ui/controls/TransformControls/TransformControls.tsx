import { calcFrameFeaturePoints } from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

const ANCHOR_RADIUS = 4;
const ANCHOR_STROKE_WIDTH = 1;
const ANCHOR_COLOR = "#0d99ff";
const ANCHOR_FILL = "white";
const ROTATION_HANDLE_OFFSET = 20;

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
}) => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;

	// Calculate all feature points (corners and edge midpoints)
	const points = calcFrameFeaturePoints({
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	// Rotation handle position (above top-center)
	const rotationY = points.topCenter.y - ROTATION_HANDLE_OFFSET;
	const rotationX = points.topCenter.x;

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
				strokeWidth={ANCHOR_STROKE_WIDTH}
				transform={`rotate(${rotation} ${cx} ${cy})`}
				pointerEvents="none"
			/>

			{/* Corner anchors */}
			<circle
				cx={points.topLeft.x}
				cy={points.topLeft.y}
				r={ANCHOR_RADIUS}
				fill={ANCHOR_FILL}
				stroke={ANCHOR_COLOR}
				strokeWidth={ANCHOR_STROKE_WIDTH}
				data-kind="control"
				data-id="transform-control:topLeft"
				style={{ cursor: "nwse-resize" }}
			/>
			<circle
				cx={points.topRight.x}
				cy={points.topRight.y}
				r={ANCHOR_RADIUS}
				fill={ANCHOR_FILL}
				stroke={ANCHOR_COLOR}
				strokeWidth={ANCHOR_STROKE_WIDTH}
				data-kind="control"
				data-id="transform-control:topRight"
				style={{ cursor: "nesw-resize" }}
			/>
			<circle
				cx={points.bottomLeft.x}
				cy={points.bottomLeft.y}
				r={ANCHOR_RADIUS}
				fill={ANCHOR_FILL}
				stroke={ANCHOR_COLOR}
				strokeWidth={ANCHOR_STROKE_WIDTH}
				data-kind="control"
				data-id="transform-control:bottomLeft"
				style={{ cursor: "nesw-resize" }}
			/>
			<circle
				cx={points.bottomRight.x}
				cy={points.bottomRight.y}
				r={ANCHOR_RADIUS}
				fill={ANCHOR_FILL}
				stroke={ANCHOR_COLOR}
				strokeWidth={ANCHOR_STROKE_WIDTH}
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
						r={ANCHOR_RADIUS}
						fill={ANCHOR_FILL}
						stroke={ANCHOR_COLOR}
						strokeWidth={ANCHOR_STROKE_WIDTH}
						data-kind="control"
						data-id="transform-control:topCenter"
						style={{ cursor: "ns-resize" }}
					/>
					<circle
						cx={points.rightCenter.x}
						cy={points.rightCenter.y}
						r={ANCHOR_RADIUS}
						fill={ANCHOR_FILL}
						stroke={ANCHOR_COLOR}
						strokeWidth={ANCHOR_STROKE_WIDTH}
						data-kind="control"
						data-id="transform-control:rightCenter"
						style={{ cursor: "ew-resize" }}
					/>
					<circle
						cx={points.bottomCenter.x}
						cy={points.bottomCenter.y}
						r={ANCHOR_RADIUS}
						fill={ANCHOR_FILL}
						stroke={ANCHOR_COLOR}
						strokeWidth={ANCHOR_STROKE_WIDTH}
						data-kind="control"
						data-id="transform-control:bottomCenter"
						style={{ cursor: "ns-resize" }}
					/>
					<circle
						cx={points.leftCenter.x}
						cy={points.leftCenter.y}
						r={ANCHOR_RADIUS}
						fill={ANCHOR_FILL}
						stroke={ANCHOR_COLOR}
						strokeWidth={ANCHOR_STROKE_WIDTH}
						data-kind="control"
						data-id="transform-control:leftCenter"
						style={{ cursor: "ew-resize" }}
					/>
				</>
			)}

			{/* Rotation handle */}
			{showRotation && (
				<>
					{/* Line connecting to rotation handle */}
					<line
						x1={points.topCenter.x}
						y1={points.topCenter.y}
						x2={rotationX}
						y2={rotationY}
						stroke={ANCHOR_COLOR}
						strokeWidth={ANCHOR_STROKE_WIDTH}
						pointerEvents="none"
					/>
					{/* Rotation handle anchor */}
					<circle
						cx={rotationX}
						cy={rotationY}
						r={ANCHOR_RADIUS}
						fill={ANCHOR_FILL}
						stroke={ANCHOR_COLOR}
						strokeWidth={ANCHOR_STROKE_WIDTH}
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
