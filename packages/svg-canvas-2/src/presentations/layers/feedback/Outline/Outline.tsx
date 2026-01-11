import { isFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";

type OutlineProps = {
	object: ObjectState;
};

const OUTLINE_COLOR = "#0d99ff";
const OUTLINE_WIDTH = 1.5;

/**
 * Renders a selection outline around an object.
 */
const OutlineComponent: React.FC<OutlineProps> = ({ object }) => {
	if (!isFrame(object)) {
		return null;
	}

	const { cx, cy, width, height } = object;

	return (
		<rect
			x={cx - width / 2}
			y={cy - height / 2}
			width={width}
			height={height}
			fill="none"
			stroke={OUTLINE_COLOR}
			strokeWidth={OUTLINE_WIDTH}
			pointerEvents="none"
		/>
	);
};

export const Outline = memo(OutlineComponent);
