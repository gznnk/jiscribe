import type React from "react";
import { memo } from "react";

const DIAMOND_SIZE = 12;
const STROKE_WIDTH = 1.5;
// Add padding for stroke to prevent clipping
const PADDING = STROKE_WIDTH;
const MARKER_SIZE = DIAMOND_SIZE + PADDING * 2;

/**
 * HollowDiamond marker definition.
 * Creates a hollow (white-filled) diamond for UML aggregation relationships.
 * Uses context-stroke for the outline and white fill.
 */
const HollowDiamondMarkerComponent: React.FC = () => {
	return (
		<marker
			id="marker-hollow-diamond"
			markerWidth={MARKER_SIZE}
			markerHeight={MARKER_SIZE}
			refX={MARKER_SIZE - 0.7}
			refY={MARKER_SIZE / 2}
			orient="auto-start-reverse"
			markerUnits="userSpaceOnUse"
		>
			<polygon
				points={`${PADDING},${MARKER_SIZE / 2} ${MARKER_SIZE / 2},${PADDING} ${DIAMOND_SIZE + PADDING},${MARKER_SIZE / 2} ${MARKER_SIZE / 2},${DIAMOND_SIZE + PADDING}`}
				fill="white"
				stroke="context-stroke"
				strokeWidth={STROKE_WIDTH}
				strokeLinejoin="miter"
				strokeLinecap="square"
			/>
		</marker>
	);
};

export const HollowDiamondMarker = memo(HollowDiamondMarkerComponent);
