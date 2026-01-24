import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { createSvgTransform } from "../../../objects/utils/createSvgTransform";

type OutlineProps = {
	object: ObjectState;
};

const OUTLINE_COLOR = "#0d99ff";
const OUTLINE_WIDTH = 1.5;

/**
 * Renders a selection outline around an object.
 */
const OutlineComponent: React.FC<OutlineProps> = ({ object }) => {
	if (!isTransformedFrame(object)) {
		return null;
	}

	const { cx, cy, width, height, scaleX, scaleY, rotation } = object;
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
