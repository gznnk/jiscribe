import type React from "react";
import { memo } from "react";

import type { ArrowHeadType } from "../../../../../../types/core/ArrowHeadType";
import { ArrowHead } from "../../../../../core/ArrowHead";

type ArrowHeadIconPreviewProps = {
	arrowType: ArrowHeadType | undefined;
	direction: "start" | "end";
};

/**
 * ArrowHeadIconPreview component.
 * Renders arrow head preview icons using the ArrowHead component.
 * Supports standard arrows and UML relationship markers.
 */
const ArrowHeadIconPreviewComponent: React.FC<ArrowHeadIconPreviewProps> = ({
	arrowType,
	direction,
}) => {
	const isStart = direction === "start";

	// Determine arrow position and rotation based on direction
	// Start arrow is on the left (x=0) pointing left (180deg), end arrow is on the right (x=24) pointing right (0deg)
	const arrowX = isStart ? 1 : 23;
	const arrowY = 12;
	const arrowRadians = isStart ? Math.PI : 0;

	return (
		<svg width="24" height="24" viewBox="0 6 24 12">
			{/* Visible path */}
			<path d="M 2 12 L 22 12" stroke="#333333" strokeWidth="2" fill="none" />
			{/* Arrow head */}
			{arrowType && arrowType !== "None" && (
				<ArrowHead
					type={arrowType}
					x={arrowX}
					y={arrowY}
					color="#333333"
					radians={arrowRadians}
					scale={1.5}
				/>
			)}
		</svg>
	);
};

export const ArrowHeadIconPreview = memo(ArrowHeadIconPreviewComponent);
