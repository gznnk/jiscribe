import type { Point } from "@workspace/geometry";
import { Fragment, memo } from "react";

import { theme } from "../../../../constants/theme";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";

const VERTEX_RING_RADIUS = 7;
const VERTEX_RING_STROKE_WIDTH = 1.5;
const VERTEX_RING_OPACITY = 0.6;

type VertexControlsProps = {
	/**
	 * The object ID for generating control IDs.
	 */
	objectId: string;
	/**
	 * The array of vertex points to show controls for.
	 */
	points: Point[];
	/**
	 * Zoom level for adjusting handle sizes.
	 * @default 1
	 */
	zoom?: number;
	/**
	 * Index of the currently selected vertex. null if no vertex is selected.
	 * @default null
	 */
	selectedVertexIndex?: number | null;
};

/**
 * VertexControls component for Polyline vertex editing.
 *
 * This is a pure presentation component that renders visual vertex handles.
 * All interaction logic should be handled by the VertexControlHandler.
 *
 * Each vertex has:
 * - data-kind="control" for GestureHandler to identify
 * - data-id=<objectId> + data-part="vertex:<vertexIndex>" for identifying which vertex was interacted with
 */
const VertexControlsComponent: React.FC<VertexControlsProps> = ({
	objectId,
	points,
	zoom = 1,
	selectedVertexIndex = null,
}) => {
	const { handleDimensions } = useCanvasTheme();
	const adjustedVertexRadius = handleDimensions.anchorRadius / zoom;
	const adjustedRingRadius = VERTEX_RING_RADIUS / zoom;
	const adjustedStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;

	return (
		<g>
			{points.map((point, index) => {
				const isSelected = selectedVertexIndex === index;
				return (
					<Fragment key={index}>
						{isSelected && (
							<circle
								cx={point.x}
								cy={point.y}
								r={adjustedRingRadius}
								fill="none"
								strokeWidth={VERTEX_RING_STROKE_WIDTH / zoom}
								strokeOpacity={VERTEX_RING_OPACITY}
								style={{ stroke: theme.handleAccent, pointerEvents: "none" }}
							/>
						)}
						<circle
							cx={point.x}
							cy={point.y}
							r={adjustedVertexRadius}
							strokeWidth={
								isSelected ? adjustedStrokeWidth * 1.5 : adjustedStrokeWidth
							}
							data-kind="control"
							data-id={objectId}
							data-part={`vertex:${index}`}
							style={{
								fill: isSelected ? theme.handleAccent : theme.handleFill,
								stroke: isSelected ? theme.handleFill : theme.handleAccent,
								cursor: "move",
							}}
						/>
					</Fragment>
				);
			})}
		</g>
	);
};

export const VertexControls = memo(VertexControlsComponent);
