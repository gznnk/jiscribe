import { isTransformedFrame } from "@jiscribe/geometry";
import { memo } from "react";

import { SELECTION_OUTLINE_WIDTH } from "../../../../constants/selectionOutline";
import { theme } from "../../../../constants/theme";
import { useObjectTextRegionRegistry } from "../../../../rendering/objects/registry/ObjectTextRegionRegistryContext";
import { calcTextRegion } from "../../../../rendering/objects/utils/calcTextRegion";
import { createSvgTransform } from "../../../../rendering/objects/utils/createSvgTransform";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

type TextSlotOutlineProps = {
	object: ObjectState;
	slotId: string;
};

/**
 * Outlines one text slot inside its shape, drawn on top of the shape's own selection
 * outline to show that the selection has stepped one level in. The region comes from
 * the same calcTextRegion seam the renderer and the text editor use, so the box sits
 * exactly where the slot's text is.
 */
const TextSlotOutlineComponent: React.FC<TextSlotOutlineProps> = ({
	object,
	slotId,
}) => {
	const textRegionRegistry = useObjectTextRegionRegistry();

	if (!isTransformedFrame(object)) {
		return null;
	}

	// Local coordinates (origin at the shape center), so the shape's own transform places it.
	const region = calcTextRegion(
		object,
		slotId,
		textRegionRegistry.get(object.type),
	);
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

export const TextSlotOutline = memo(TextSlotOutlineComponent);
