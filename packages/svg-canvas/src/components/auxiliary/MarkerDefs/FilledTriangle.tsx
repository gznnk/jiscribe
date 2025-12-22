import type React from "react";
import { memo } from "react";

const TRIANGLE_SIZE = 14;

/**
 * FilledTriangle arrow marker definition.
 * Creates a standard filled triangular arrow head marker for use with SVG paths.
 * Uses context-stroke to inherit color from the path.
 */
const FilledTriangleMarkerComponent: React.FC = () => {
	return (
		<marker
			id="marker-filled-triangle"
			markerWidth={TRIANGLE_SIZE}
			markerHeight={TRIANGLE_SIZE}
			refX={TRIANGLE_SIZE}
			refY={TRIANGLE_SIZE / 2}
			orient="auto-start-reverse"
			markerUnits="userSpaceOnUse"
		>
			<polygon
				points={`0,0 ${TRIANGLE_SIZE},${TRIANGLE_SIZE / 2} 0,${TRIANGLE_SIZE}`}
				fill="context-stroke"
			/>
		</marker>
	);
};

export const FilledTriangleMarker = memo(FilledTriangleMarkerComponent);
