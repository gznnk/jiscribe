import {
	calcFrameKeyPoints,
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { theme } from "../../../../constants/theme";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import { RotateRight } from "../../icons/RotateRight";
import { getResizeCursorForRotation } from "../../utils/getResizeCursorForRotation";

type TransformControlsProps = {
	/**
	 * The frame (bounding box) to show controls for.
	 */
	frame: TransformedFrame;
	/**
	 * Zoom level for adjusting handle sizes.
	 * @default 1
	 */
	zoom?: number;
};

/**
 * TransformControls component for canvas.
 *
 * This component renders visual transform handles for the selected object.
 * All interaction logic is handled by the GestureHandler via data attributes.
 *
 * Each anchor has:
 * - data-kind="control" for GestureHandler to identify
 * - data-id="transform" + data-part="resize:<anchorType>" / "rotation" for identifying which anchor was interacted with
 */
const TransformControlsComponent: React.FC<TransformControlsProps> = ({
	frame,
	zoom = 1,
}) => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;
	const { handleDimensions } = useCanvasTheme();
	const rotationIconSize = handleDimensions.rotationIconSize;

	// Adjust sizes based on zoom level to maintain consistent visual size
	const scale = 1 / zoom;
	const adjustedAnchorRadius = handleDimensions.anchorRadius / zoom;
	const adjustedStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;
	const adjustedRotationOffset = handleDimensions.rotationHandleOffset / zoom;
	const adjustedRotationHitRadius = handleDimensions.rotationHitRadius / zoom;

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

	// Rotation handle position (top-right corner with offset).
	//
	// Spec (intentional design; issue #73 behaves per this spec and is closed):
	// The scale in the 3rd/4th arguments is always 1, 1, not scaleX/scaleY.
	// The resize handles (calcFrameKeyPoints) reflect the actual scale, so with a
	// negative scale (flip) the corners swap left/right or top/bottom from their
	// logical positions. The rotation handle, however, should behave as "a rotate
	// knob that always appears at the top-right on screen", not "the top-right of
	// the object's content". Fixing the scale at 1, 1 keeps the rotation handle's
	// display position and rotation direction constant even when flipped, so the
	// user doesn't have to hunt for the knob.
	// → Therefore the rotation handle appearing away from the flipped corner is by
	//   design, not a bug. Do not re-flag this as a bug that "ignores" scaleX/scaleY
	//   in static analysis.
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
			{/* Handle colors may hold var(--jiscribe-*), so they are applied via style
			    (fill/stroke) rather than SVG presentation attributes. */}
			{/* Corner anchors */}
			<circle
				cx={points.topLeft.x}
				cy={points.topLeft.y}
				r={adjustedAnchorRadius}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform"
				data-part="resize:topLeft"
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor: cursors.topLeft,
				}}
			/>
			<circle
				cx={points.topRight.x}
				cy={points.topRight.y}
				r={adjustedAnchorRadius}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform"
				data-part="resize:topRight"
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor: cursors.topRight,
				}}
			/>
			<circle
				cx={points.bottomLeft.x}
				cy={points.bottomLeft.y}
				r={adjustedAnchorRadius}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform"
				data-part="resize:bottomLeft"
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor: cursors.bottomLeft,
				}}
			/>
			<circle
				cx={points.bottomRight.x}
				cy={points.bottomRight.y}
				r={adjustedAnchorRadius}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform"
				data-part="resize:bottomRight"
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor: cursors.bottomRight,
				}}
			/>

			{/* Edge midpoint anchors */}
			<circle
				cx={points.topCenter.x}
				cy={points.topCenter.y}
				r={adjustedAnchorRadius}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform"
				data-part="resize:topCenter"
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor: cursors.topCenter,
				}}
			/>
			<circle
				cx={points.rightCenter.x}
				cy={points.rightCenter.y}
				r={adjustedAnchorRadius}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform"
				data-part="resize:rightCenter"
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor: cursors.rightCenter,
				}}
			/>
			<circle
				cx={points.bottomCenter.x}
				cy={points.bottomCenter.y}
				r={adjustedAnchorRadius}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform"
				data-part="resize:bottomCenter"
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor: cursors.bottomCenter,
				}}
			/>
			<circle
				cx={points.leftCenter.x}
				cy={points.leftCenter.y}
				r={adjustedAnchorRadius}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id="transform"
				data-part="resize:leftCenter"
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor: cursors.leftCenter,
				}}
			/>

			{/* Rotation handle */}
			<g
				transform={`translate(${rotationPoint.x} ${rotationPoint.y}) rotate(${rotation}) scale(${scale}) translate(${-rotationIconSize / 2} ${-rotationIconSize / 2})`}
			>
				<RotateRight width={rotationIconSize} height={rotationIconSize} />
			</g>
			<circle
				cx={rotationPoint.x}
				cy={rotationPoint.y}
				r={adjustedRotationHitRadius}
				fill="transparent"
				data-kind="control"
				data-id="transform"
				data-part="rotation"
				style={{ cursor: "grab" }}
			/>
		</g>
	);
};

export const TransformControls = memo(TransformControlsComponent);
