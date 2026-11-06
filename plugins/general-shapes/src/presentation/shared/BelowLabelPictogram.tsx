import type { FrameShapeProps } from "@jiscribe/canvas-sdk";
import { BelowLabelHitArea } from "@jiscribe/canvas-sdk";
import type { TextSlot } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

import { Pictogram } from "./Pictogram";
import type { PictogramFigure } from "./PictogramFigure";

type BelowLabelPictogramProps = {
	/** The paths to draw, already laid out in the shape's local coordinates. */
	figure: PictogramFigure;
	/** Shared frame attributes from createFrameObject (ids, transform, resolved colors). */
	shape: FrameShapeProps;
	/** The shape's type and the box the figure fills, plus the slots the label is sized from. */
	state: Dimensions & { type: string; text?: Record<string, TextSlot> };
};

/**
 * A pictogram whose drawing takes the whole box, so its label hangs underneath
 * (`features.text: "label"`). The label sits outside the box and its own
 * foreignObject is `pointer-events: none`, so it gets a hit area of its own.
 */
export const BelowLabelPictogram: React.FC<BelowLabelPictogramProps> = ({
	figure,
	shape,
	state,
}) => (
	<Pictogram figure={figure} shape={shape}>
		<BelowLabelHitArea state={state} />
	</Pictogram>
);
