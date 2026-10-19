import { isTransformedFrame } from "@jiscribe/geometry";
import type { Rect } from "@jiscribe/geometry";
import { memo } from "react";

import { createSvgTransform } from "../../../../rendering/objects/utils/createSvgTransform";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { theme } from "../../../../theme/themeTokens";
import { SELECTION_OUTLINE_WIDTH } from "../utils/selectionOutline";

type ObjectPartOutlineProps = {
	/** The object the part belongs to; only its transform is read here. */
	object: ObjectState;
	/** The part's box in the object's local coordinates (ObjectPartKindDefinition.region). */
	region: Rect;
	/** Whether the box is tinted inside as well as outlined; false while a text edit is open, the tint lying under the caret and the text selection. */
	filled: boolean;
};

/**
 * The tint inside a picked part's box: the accent faded to a wash the part's own
 * fill and text still read through.
 */
const PART_SELECTION_FILL = `color-mix(in srgb, ${theme.handleAccent} 18%, transparent)`;

/**
 * Outlines one sub-part inside its object, in place of the object's own selection
 * outline (SelectionOverlay), to show that the selection has stepped one level in.
 * The box is the type's own answer for that part, so a text slot's outline sits
 * exactly where the slot's text is drawn. It is tinted inside too: the outlines
 * of a run of cells otherwise trace the table's own rules, and the extent of the
 * pick is lost among them.
 */
const ObjectPartOutlineComponent: React.FC<ObjectPartOutlineProps> = ({
	object,
	region,
	filled,
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
			// Tells a part's box from an object outline, which is drawn the same way.
			data-testid="part-outline"
			strokeWidth={SELECTION_OUTLINE_WIDTH}
			pointerEvents="none"
			// The color may hold var(--jiscribe-*), so it is applied via style.
			style={{
				fill: filled ? PART_SELECTION_FILL : "none",
				stroke: theme.handleAccent,
			}}
		/>
	);
};

export const ObjectPartOutline = memo(ObjectPartOutlineComponent);
