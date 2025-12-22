import type React from "react";
import { memo } from "react";

const TRIANGLE_SIZE = 14;

/**
 * Concave Triangle arrow marker definition.
 * Creates a concave triangular arrow head marker for use with SVG paths.
 * Uses context-stroke to inherit color from the path.
 */
const ConcaveTriangleMarkerComponent: React.FC = () => {
	return (
		<marker
			id="marker-concave-triangle"
			markerWidth={TRIANGLE_SIZE}
			markerHeight={TRIANGLE_SIZE}
			refX={TRIANGLE_SIZE}
			refY={TRIANGLE_SIZE / 2}
			orient="auto-start-reverse"
			markerUnits="userSpaceOnUse"
		>
			<polygon
				points={`0,0 ${TRIANGLE_SIZE},${TRIANGLE_SIZE / 2} 0,${TRIANGLE_SIZE} ${TRIANGLE_SIZE * 0.1},${TRIANGLE_SIZE / 2}`}
				fill="context-stroke"
			/>
		</marker>
	);
};

export const ConcaveTriangleMarker = memo(ConcaveTriangleMarkerComponent);
