import type React from "react";
import { memo } from "react";

import type { ArrowHeadType } from "../../../../../../types/core/ArrowHeadType";
import { getMarkerUrl } from "../../../../../../utils/shapes/path/getMarkerUrl";

type ArrowHeadIconPreviewProps = {
	arrowType: ArrowHeadType | undefined;
	direction: "start" | "end";
};

/**
 * ArrowHeadIconPreview component.
 * Renders arrow head preview icons that exactly match the MarkerDefs definitions.
 * Uses marker definitions from MarkerDefs via getMarkerUrl utility function
 * for perfect consistency with actual diagram arrows.
 * Supports standard arrows and UML relationship markers.
 */
const ArrowHeadIconPreviewComponent: React.FC<ArrowHeadIconPreviewProps> = ({
	arrowType,
	direction,
}) => {
	const isStart = direction === "start";
	const markerUrl = getMarkerUrl(arrowType);

	// Use two paths to prevent stroke overflow at arrow tips:
	// 1. Invisible path for marker positioning (strokeWidth: 0)
	// 2. Visible path shortened on the marker side to avoid overlap
	//    - Start arrow: shorten left side (M 7 12 L 22 12)
	//    - End arrow: shorten right side (M 2 12 L 17 12)
	//    - No arrow: full width (M 2 12 L 22 12)
	const shouldShowFullPath = !markerUrl || arrowType === "OpenArrow";
	const visiblePathD = shouldShowFullPath
		? "M 2 12 L 22 12"
		: isStart
			? "M 7 12 L 22 12"
			: "M 2 12 L 17 12";

	return (
		<svg width="24" height="24" viewBox="0 6 24 12">
			{/* Visible path shortened on marker side to avoid overlap */}
			<path d={visiblePathD} stroke="#333333" strokeWidth="2" fill="none" />
			{/* Invisible path for marker positioning */}
			<path
				d="M 2 12 L 22 12"
				stroke="#333333"
				strokeWidth="0"
				fill="none"
				markerStart={isStart ? markerUrl : undefined}
				markerEnd={!isStart ? markerUrl : undefined}
			/>
		</svg>
	);
};

export const ArrowHeadIconPreview = memo(ArrowHeadIconPreviewComponent);
