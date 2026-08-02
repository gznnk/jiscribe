import { BODY_TEXT_SLOT_ID } from "@workspace/canvas";
import type { TextSlot } from "@workspace/canvas/doc";
import type { FrameShapeProps } from "@workspace/canvas/unstable";
import { readTextSlot } from "@workspace/canvas/unstable";
import type { Dimensions } from "@workspace/geometry";

import { calcBelowLabelTextRegion } from "./calcBelowLabelTextRegion";
import { Pictogram } from "./Pictogram";
import type { PictogramFigure } from "./PictogramFigure";
import { PictogramHitArea } from "./PictogramStyled";

type BelowLabelPictogramProps = {
	/** The paths to draw, already laid out in the shape's local coordinates. */
	figure: PictogramFigure;
	/** Shared frame attributes from createFrameObject (ids, transform, resolved colors). */
	shape: FrameShapeProps;
	/** The box the figure fills, plus the slots the label is sized from. */
	state: Dimensions & { text?: Record<string, TextSlot> };
};

/**
 * A pictogram whose drawing takes the whole box, so its label hangs underneath
 * (calcBelowLabelTextRegion). The label sits outside the box and its own
 * foreignObject is `pointer-events: none`, so it gets a hit area of its own;
 * `data-part` names the slot a double-click on it opens (resolveTextSlotId).
 * An empty label draws nothing and gets no hit area.
 */
export const BelowLabelPictogram: React.FC<BelowLabelPictogramProps> = ({
	figure,
	shape,
	state,
}) => {
	const label =
		readTextSlot(state.text, BODY_TEXT_SLOT_ID) === ""
			? null
			: calcBelowLabelTextRegion(state, BODY_TEXT_SLOT_ID);
	return (
		<Pictogram figure={figure} shape={shape}>
			{label && (
				<PictogramHitArea
					data-part={BODY_TEXT_SLOT_ID}
					x={label.x}
					y={label.y}
					width={label.width}
					height={label.height}
				/>
			)}
		</Pictogram>
	);
};
