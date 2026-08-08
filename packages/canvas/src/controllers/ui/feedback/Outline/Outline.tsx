import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import {
	SELECTION_OUTLINE_DASH_PATTERN,
	SELECTION_OUTLINE_WIDTH,
} from "../../../../constants/selectionOutline";
import { theme } from "../../../../constants/theme";
import { createSvgTransform } from "../../../../presentations/objects/utils/createSvgTransform";

type OutlineProps = {
	frame: TransformedFrame;
	/** Draws the outline dashed, marking the object as the context of a selection that sits inside it */
	dashed?: boolean;
};

/**
 * Renders a selection outline around a transformed frame.
 */
const OutlineComponent: React.FC<OutlineProps> = ({
	frame,
	dashed = false,
}) => {
	const { cx, cy, width, height, scaleX, scaleY, rotation } = frame;
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	return (
		<rect
			x={-width / 2}
			y={-height / 2}
			width={width}
			height={height}
			transform={transformAttr}
			fill="none"
			strokeWidth={SELECTION_OUTLINE_WIDTH}
			strokeDasharray={
				dashed ? SELECTION_OUTLINE_DASH_PATTERN.join(" ") : undefined
			}
			pointerEvents="none"
			// The color may hold var(--jiscribe-*), so it is applied via style.
			style={{ stroke: theme.handleAccent }}
		/>
	);
};

export const Outline = memo(OutlineComponent);
