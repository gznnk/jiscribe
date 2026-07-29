import { memo } from "react";

import { Arrow } from "../../../../../../presentations/objects/arrows/Arrow";
import { getArrowLineInset } from "../../../../../../presentations/objects/arrows/getArrowLineInset";
import type { ArrowType } from "../../../../../../schemas/objects/types/ArrowType";

type ArrowHeadIconPreviewProps = {
	arrowType: ArrowType | undefined;
	direction: "start" | "end";
};

/** Scale used whenever the arrow fits at full size. */
const PREVIEW_SCALE = 1.5;

/**
 * Horizontal run available to the arrow inside the 24-wide icon, leaving a
 * pixel of margin at the far edge. Long marks (the ER crow's foot family) are
 * scaled down to this instead of being clipped by the icon's viewport.
 */
const PREVIEW_SPAN = 22;

const ArrowHeadIconPreviewComponent: React.FC<ArrowHeadIconPreviewProps> = ({
	arrowType,
	direction,
}) => {
	const isStart = direction === "start";
	const type = arrowType ?? "None";

	const baseInset = getArrowLineInset(type);
	const scale =
		baseInset > 0
			? Math.min(PREVIEW_SCALE, PREVIEW_SPAN / baseInset)
			: PREVIEW_SCALE;
	const tipX = isStart ? 1 : 23;
	const radians = isStart ? Math.PI : 0;

	// Shorten the line to the base of the arrowhead to prevent it from passing through the hollow interior or protruding past the tip.
	const inset = baseInset * scale;
	const lineX1 = isStart && inset > 0 ? tipX + inset : 2;
	const lineX2 = !isStart && inset > 0 ? tipX - inset : 22;

	return (
		<svg
			width="24"
			height="24"
			viewBox="0 6 24 12"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			style={{ pointerEvents: "none" }}
		>
			<line
				x1={lineX1}
				y1="12"
				x2={lineX2}
				y2="12"
				stroke="currentColor"
				strokeWidth="2"
			/>

			<Arrow
				type={type}
				x={tipX}
				y={12}
				color="currentColor"
				radians={radians}
				scale={scale}
			/>
		</svg>
	);
};

export const ArrowHeadIconPreview = memo(ArrowHeadIconPreviewComponent);
