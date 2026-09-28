import { isTransformedFrame } from "@jiscribe/geometry";
import type { Rect } from "@jiscribe/geometry";
import { memo } from "react";

import { createSvgTransform } from "../../../../rendering/objects/utils/createSvgTransform";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { theme } from "../../../../theme/themeTokens";
import { SELECTION_OUTLINE_WIDTH } from "../selectionOutline";

type ObjectPartOutlineProps = {
	/** The object the part belongs to; only its transform is read here. */
	object: ObjectState;
	/** The part's box in the object's local coordinates (ObjectPartDefinition.region). */
	region: Rect;
};

/**
 * Outlines one sub-part inside its object, drawn on top of the object's own
 * selection outline to show that the selection has stepped one level in. The box
 * is the type's own answer for that part, so a text slot's outline sits exactly
 * where the slot's text is drawn.
 */
const ObjectPartOutlineComponent: React.FC<ObjectPartOutlineProps> = ({
	object,
	region,
}) => {
	if (!isTransformedFrame(object)) {
		return null;
	}

	const { cx, cy, scaleX, scaleY, rotation } = object;

	return (
		<rect
			x={region.x}
			y={region.y}
			width={region.width}
			height={region.height}
			transform={createSvgTransform(scaleX, scaleY, rotation, cx, cy)}
			fill="none"
			strokeWidth={SELECTION_OUTLINE_WIDTH}
			pointerEvents="none"
			// The color may hold var(--jiscribe-*), so it is applied via style.
			style={{ stroke: theme.handleAccent }}
		/>
	);
};

export const ObjectPartOutline = memo(ObjectPartOutlineComponent);
