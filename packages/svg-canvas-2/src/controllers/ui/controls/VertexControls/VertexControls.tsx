import type { Point } from "@workspace/geometry";
import { memo } from "react";

const VERTEX_RADIUS = 4;
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
}) => {
	// Adjust sizes based on zoom level to maintain consistent visual size
	const adjustedVertexRadius = VERTEX_RADIUS / zoom;
	const adjustedStrokeWidth = VERTEX_STROKE_WIDTH / zoom;

	return (
		<g>
			{points.map((point, index) => (
				<circle
					key={index}
					cx={point.x}
					cy={point.y}
					r={adjustedVertexRadius}
					fill={VERTEX_FILL}
					stroke={VERTEX_COLOR}
					strokeWidth={adjustedStrokeWidth}
					data-kind="control"
					data-id={`vertex-control:${objectId}:${index}`}
					style={{ cursor: "move" }}
				/>
			))}
		</g>
	);
};

export const VertexControls = memo(VertexControlsComponent);
