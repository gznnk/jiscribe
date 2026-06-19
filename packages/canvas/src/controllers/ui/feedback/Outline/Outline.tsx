import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { createSvgTransform } from "../../../../presentations/objects/utils/createSvgTransform";

type OutlineProps = {
	frame: TransformedFrame;
};

const OUTLINE_COLOR = "#0d99ff";
const OUTLINE_WIDTH = 1.5;

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
			stroke={OUTLINE_COLOR}
			strokeWidth={OUTLINE_WIDTH}
			pointerEvents="none"
		/>
	);
};

export const Outline = memo(OutlineComponent);
