import type { TransformedFrame } from "@jiscribe/geometry";
import { memo } from "react";

import { createSvgTransform } from "../../../../rendering/objects/utils/createSvgTransform";
import { theme } from "../../../../theme/themeTokens";
import { SELECTION_OUTLINE_WIDTH } from "../utils/selectionOutline";

type OutlineProps = {
	frame: TransformedFrame;
};

/**
 * Renders a selection outline around a transformed frame.
 */
const OutlineComponent: React.FC<OutlineProps> = ({ frame }) => {
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
			pointerEvents="none"
			// The color may hold var(--jiscribe-*), so it is applied via style.
			style={{ stroke: theme.handleAccent }}
		/>
	);
};

export const Outline = memo(OutlineComponent);
