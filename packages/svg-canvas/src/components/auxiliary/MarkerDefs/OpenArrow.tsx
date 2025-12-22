import type React from "react";
import { memo } from "react";

const TRIANGLE_SIZE = 12;
const STROKE_WIDTH = 1.5;
// Add padding for stroke to prevent clipping
const PADDING = STROKE_WIDTH;
const MARKER_SIZE = TRIANGLE_SIZE + PADDING * 2;

/**
 * OpenArrow marker definition.
 * Creates an open arrow marker for UML dependency relationships.
 * Uses context-stroke for the outline only (not filled).
 */
const OpenArrowMarkerComponent: React.FC = () => {
	return (
		<marker
			id="marker-open-arrow"
			markerWidth={MARKER_SIZE}
			markerHeight={MARKER_SIZE}
			refX={MARKER_SIZE - 0.7}
			refY={MARKER_SIZE / 2}
			orient="auto-start-reverse"
			markerUnits="userSpaceOnUse"
		>
			<polyline
				points={`${PADDING},${PADDING} ${TRIANGLE_SIZE + PADDING},${MARKER_SIZE / 2} ${PADDING},${TRIANGLE_SIZE + PADDING}`}
				fill="none"
				stroke="context-stroke"
				strokeWidth={STROKE_WIDTH}
				strokeLinejoin="miter"
				strokeLinecap="round"
			/>
		</marker>
	);
};

export const OpenArrowMarker = memo(OpenArrowMarkerComponent);
