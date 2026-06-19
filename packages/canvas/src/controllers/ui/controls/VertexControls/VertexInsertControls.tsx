import type { Point } from "@workspace/geometry";
import { memo } from "react";

const INSERT_RADIUS = 3;
const INSERT_STROKE_WIDTH = 1.5;
const INSERT_COLOR = "#0d99ff";
const INSERT_FILL = "white";
const INSERT_OPACITY = 0.6;

type VertexInsertControlsProps = {
	/**
	 * The object ID for generating control IDs.
	 */
	objectId: string;
	/**
	 * The array of vertex points to calculate segment midpoints.
	 */
	points: Point[];
	/**
	 * Whether the shape is closed (e.g. polygon).
	 * When true, also renders a midpoint handle on the segment from the last point back to the first.
	 * @default false
	 */
	closed?: boolean;
	/**
	 * Zoom level for adjusting handle sizes.
	 * @default 1
	 */
	zoom?: number;
};

/**
 * VertexInsertControls component for inserting new vertices on Polyline segments.
 *
 * This is a pure presentation component that renders visual insertion handles at segment midpoints.
 * All interaction logic should be handled by the VertexInsertHandler.
 *
 * Each insertion control has:
 * - data-kind="control" for GestureHandler to identify
 * - data-id="vertex-insert:<objectId>:<segmentIndex>" for identifying which segment was interacted with
 */
const VertexInsertControlsComponent: React.FC<VertexInsertControlsProps> = ({
	objectId,
	points,
	closed = false,
	zoom = 1,
}) => {
	// Adjust sizes based on zoom level to maintain consistent visual size
	const adjustedRadius = INSERT_RADIUS / zoom;
	const adjustedStrokeWidth = INSERT_STROKE_WIDTH / zoom;

	// Calculate midpoints for each segment
	const segmentMidpoints: { point: Point; segmentIndex: number }[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		const start = points[i];
		const end = points[i + 1];
		const midpoint: Point = {
			x: (start.x + end.x) / 2,
			y: (start.y + end.y) / 2,
		};
		segmentMidpoints.push({ point: midpoint, segmentIndex: i });
	}

	// For closed shapes (polygon), also add midpoint for the closing segment (last → first)
	if (closed && points.length >= 2) {
		const last = points[points.length - 1];
		const first = points[0];
		const midpoint: Point = {
			x: (last.x + first.x) / 2,
			y: (last.y + first.y) / 2,
		};
		segmentMidpoints.push({ point: midpoint, segmentIndex: points.length - 1 });
	}

	return (
		<g opacity={INSERT_OPACITY}>
			{segmentMidpoints.map(({ point, segmentIndex }) => (
				<circle
					key={segmentIndex}
					cx={point.x}
					cy={point.y}
					r={adjustedRadius}
					fill={INSERT_FILL}
					stroke={INSERT_COLOR}
					strokeWidth={adjustedStrokeWidth}
					data-kind="control"
					data-id={`vertex-insert:${objectId}:${segmentIndex}`}
					style={{ cursor: "crosshair" }}
				/>
			))}
		</g>
	);
};

export const VertexInsertControls = memo(VertexInsertControlsComponent);
