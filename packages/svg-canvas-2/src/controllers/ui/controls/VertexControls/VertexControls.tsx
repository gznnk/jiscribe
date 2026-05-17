import type { Point } from "@workspace/geometry";
import { Fragment, memo } from "react";

const VERTEX_RADIUS = 4;
const VERTEX_RING_RADIUS = 7;
const VERTEX_STROKE_WIDTH = 1;
const VERTEX_COLOR = "#0d99ff";
const VERTEX_FILL = "white";

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
 * - data-id="vertex-control:<objectId>:<vertexIndex>" for identifying which vertex was interacted with
 */
const VertexControlsComponent: React.FC<VertexControlsProps> = ({
	objectId,
	points,
	zoom = 1,
	selectedVertexIndex = null,
}) => {
	const adjustedVertexRadius = VERTEX_RADIUS / zoom;
	const adjustedRingRadius = VERTEX_RING_RADIUS / zoom;
	const adjustedStrokeWidth = VERTEX_STROKE_WIDTH / zoom;

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
								stroke={VERTEX_COLOR}
								strokeWidth={adjustedStrokeWidth}
								strokeOpacity={0.4}
								style={{ pointerEvents: "none" }}
							/>
						)}
						<circle
							cx={point.x}
							cy={point.y}
							r={adjustedVertexRadius}
							fill={isSelected ? VERTEX_COLOR : VERTEX_FILL}
							stroke={isSelected ? VERTEX_FILL : VERTEX_COLOR}
							strokeWidth={isSelected ? adjustedStrokeWidth * 1.5 : adjustedStrokeWidth}
							data-kind="control"
							data-id={`vertex-control:${objectId}:${index}`}
							style={{ cursor: "move" }}
						/>
					</Fragment>
				);
			})}
		</g>
	);
};

export const VertexControls = memo(VertexControlsComponent);
