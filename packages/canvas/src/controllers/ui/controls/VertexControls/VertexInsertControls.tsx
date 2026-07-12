import type { Point } from "@workspace/geometry";
import { memo } from "react";

import { theme } from "../../../../constants/theme";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";

// Handle colors may hold var(--jiscribe-*), so they are applied via style
// (fill/stroke) rather than SVG presentation attributes.
const insertHandleStyle = {
	fill: theme.connectionAccent,
	stroke: theme.connectionAccent,
	cursor: "crosshair",
} as const;

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
	/**
	 * data-part subtype, routing the gesture to the matching handler.
	 * Polyline/polygon use `"vertex-insert"` (default, → VertexInsertHandler);
	 * connectors pass `"waypoint-insert"` (→ ConnectorVertexInsertHandler),
	 * because the inserted point maps to a different array index (see those handlers).
	 * @default "vertex-insert"
	 */
	insertPartSubtype?: string;
};

/**
 * VertexInsertControls component for inserting new vertices on Polyline segments.
 *
 * This is a pure presentation component that renders a simple blue dot at each segment
 * midpoint (matching the connector ConnectionAnchors / Miro style), signalling that a
 * new vertex can be added there. All interaction logic should be handled by the
 * insert handler matching `insertPartSubtype`.
 *
 * Each insertion control has:
 * - data-kind="control" for GestureHandler to identify
 * - data-id=<objectId> + data-part="<insertPartSubtype>:<segmentIndex>" for identifying which segment was interacted with
 */
const VertexInsertControlsComponent: React.FC<VertexInsertControlsProps> = ({
	objectId,
	points,
	closed = false,
	zoom = 1,
	insertPartSubtype = "vertex-insert",
}) => {
	const { handleDimensions } = useCanvasTheme();

	// Adjust sizes based on zoom level to maintain consistent visual size
	const adjustedRadius = handleDimensions.anchorRadius / zoom;
	const adjustedStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;

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
		<>
			{segmentMidpoints.map(({ point, segmentIndex }) => (
				<circle
					key={segmentIndex}
					cx={point.x}
					cy={point.y}
					r={adjustedRadius}
					strokeWidth={adjustedStrokeWidth}
					data-kind="control"
					data-id={objectId}
					data-part={`${insertPartSubtype}:${segmentIndex}`}
					style={insertHandleStyle}
				/>
			))}
		</>
	);
};

export const VertexInsertControls = memo(VertexInsertControlsComponent);
