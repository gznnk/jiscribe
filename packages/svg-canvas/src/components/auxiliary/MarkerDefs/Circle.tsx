import type React from "react";
import { memo } from "react";

const CIRCLE_SIZE = 11;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;

/**
 * Circle marker definition.
 * Creates a circular marker for use with SVG paths.
 * Uses context-stroke to inherit color from the path.
 */
const CircleMarkerComponent: React.FC = () => {
	return (
		<marker
			id="marker-circle"
			markerWidth={CIRCLE_SIZE}
			markerHeight={CIRCLE_SIZE}
			refX={CIRCLE_SIZE}
			refY={CIRCLE_RADIUS}
			orient="auto-start-reverse"
			markerUnits="userSpaceOnUse"
		>
			<circle
				cx={CIRCLE_RADIUS}
				cy={CIRCLE_RADIUS}
				r={CIRCLE_RADIUS}
				fill="context-stroke"
			/>
		</marker>
	);
};

export const CircleMarker = memo(CircleMarkerComponent);
