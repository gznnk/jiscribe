import { BODY_TEXT_SLOT_ID } from "@jiscribe/canvas";
import type {
	ObjectTextRegionCalculator,
	ObjectVisualBoundsCalculator,
} from "@jiscribe/canvas";
import { calcLabelBoxSize, readTextSlot } from "@jiscribe/canvas-sdk";
import type { TextSlot } from "@jiscribe/doc";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import {
	AWS_GROUP_CORNER_ICON_SIZE,
	AWS_GROUP_LABEL_GAP,
	AWS_GROUP_PADDING,
} from "../schema/AwsGroupDoc";
import { readAwsGroupKindStyle } from "../schema/awsGroupKinds";

/** What placing the label reads off a state: the box, the kind, the text slots. */
type AwsGroupLabelState = Dimensions & {
	/** Which frame this is. Omitted and unknown values are treated as the default kind. */
	kind?: string;
	/** The text slots. Absent, the label is measured as empty. */
	text?: Record<string, TextSlot>;
};

/**
 * Left edge of the label band: a kind with a corner badge starts that much
 * further right. Local coordinates, the shape's centre being the origin.
 */
const calcLabelLeft = (state: AwsGroupLabelState): number => {
	const hasCornerIcon =
		readAwsGroupKindStyle(state.kind).cornerIcon !== undefined;
	return (
		-state.width / 2 +
		AWS_GROUP_PADDING +
		(hasCornerIcon ? AWS_GROUP_CORNER_ICON_SIZE + AWS_GROUP_LABEL_GAP : 0)
	);
};

/**
 * Sizes the label band from the text. Building the box out of the measured text
 * rather than the frame's width (calcLabelBoxSize) gives the drawn label and the
 * editor the same rectangle, so the editor never grows a scrollbar. There is no
 * width limit: a long label runs past the frame's right edge, and only an
 * authored newline makes it grow downward.
 *
 * Vertically it is centred on the corner badge's row, kinds without a badge
 * included, so that nested frames line their labels up.
 *
 * @param state - the untransformed box (width / height), the `kind` and the text slots
 * @param slotId - the slot to place; a slot that is not there measures as an
 *   empty label and gives the smallest box
 * @returns the label rectangle in local coordinates (the shape's centre is the
 *   origin), anchored top-left
 */
export const calcAwsGroupLabelTextRegion: ObjectTextRegionCalculator<
	AwsGroupLabelState
> = (state, slotId) => {
	const { width, height } = calcLabelBoxSize(state.text, slotId);
	const rowCenterY =
		-state.height / 2 + AWS_GROUP_PADDING + AWS_GROUP_CORNER_ICON_SIZE / 2;

	return {
		x: calcLabelLeft(state),
		y: rowCenterY - height / 2,
		width,
		height,
	};
};

/**
 * What is actually painted: the frame's box plus whatever of the label runs
 * outside it. An empty label paints nothing and so adds nothing — adding it
 * would make zoom-to-fit and the export carry an empty band as margin.
 *
 * @param state - the untransformed box (width / height), the `kind` and the text slots
 * @returns the union of the box and the label, in local coordinates (the shape's
 *   centre is the origin)
 */
export const calcAwsGroupVisualBounds: ObjectVisualBoundsCalculator<
	AwsGroupLabelState
> = (state) => {
	const figure: Rect = {
		x: -state.width / 2,
		y: -state.height / 2,
		width: state.width,
		height: state.height,
	};

	if (readTextSlot(state.text, BODY_TEXT_SLOT_ID) === "") {
		return figure;
	}

	const label = calcAwsGroupLabelTextRegion(state, BODY_TEXT_SLOT_ID);
	const left = Math.min(figure.x, label.x);
	const top = Math.min(figure.y, label.y);
	const right = Math.max(figure.x + figure.width, label.x + label.width);
	const bottom = Math.max(figure.y + figure.height, label.y + label.height);
	return { x: left, y: top, width: right - left, height: bottom - top };
};
