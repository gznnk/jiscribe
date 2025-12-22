import type React from "react";
import { memo } from "react";

const DIAMOND_SIZE = 14;

/**
 * FilledDiamond marker definition.
 * Creates a filled diamond for UML composition relationships.
 * Uses context-stroke to inherit color from the path.
 */
const FilledDiamondMarkerComponent: React.FC = () => {
	const halfSize = DIAMOND_SIZE / 2;
	return (
		<marker
			id="marker-filled-diamond"
			markerWidth={DIAMOND_SIZE}
			markerHeight={DIAMOND_SIZE}
			refX={DIAMOND_SIZE}
			refY={halfSize}
			orient="auto-start-reverse"
			markerUnits="userSpaceOnUse"
		>
			<polygon
				points={`0,${halfSize} ${halfSize},0 ${DIAMOND_SIZE},${halfSize} ${halfSize},${DIAMOND_SIZE}`}
				fill="context-stroke"
			/>
		</marker>
	);
};

export const FilledDiamondMarker = memo(FilledDiamondMarkerComponent);
