import type { ObjectDocLabelRegionCalculator } from "@jiscribe/doc";
import { calcLabelTextBoxSize } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

import {
	AWS_GROUP_CORNER_ICON_SIZE,
	AWS_GROUP_LABEL_GAP,
	AWS_GROUP_PADDING,
} from "./AwsGroupDoc";
import { readAwsGroupKindStyle } from "./awsGroupKinds";

/** What placing the label reads off a doc or a state: the box and the kind. */
export type AwsGroupLabelBox = Dimensions & {
	/** Which frame this is. Omitted and unknown values are treated as the default kind. */
	kind?: string;
};

/**
 * Left edge of the label band: a kind with a corner badge starts that much
 * further right. Local coordinates, the shape's centre being the origin.
 */
const calcLabelLeft = (box: AwsGroupLabelBox): number => {
	const hasCornerIcon =
		readAwsGroupKindStyle(box.kind).cornerIcon !== undefined;
	return (
		-box.width / 2 +
		AWS_GROUP_PADDING +
		(hasCornerIcon ? AWS_GROUP_CORNER_ICON_SIZE + AWS_GROUP_LABEL_GAP : 0)
	);
};

/**
 * Places the label band beside the corner badge, sized from the text
 * (calcLabelTextBoxSize) rather than from the frame's width. There is no width
 * limit: a long label runs past the frame's right edge, and only an authored
 * newline makes it grow downward. Vertically it is centred on the corner badge's
 * row, kinds without a badge included, so that nested frames line their labels
 * up.
 *
 * Declared as the doc definition's `labelRegion`, from which the core places the
 * drawn label, the in-place editor and the visual bounds, so the editor never
 * grows a scrollbar.
 *
 * @param box - The untransformed box (width / height) and the `kind`
 * @param body - The label's content and styling (see calcLabelTextBoxSize); undefined measures an empty label and gives the smallest box
 * @param typeDefaults - The type's defaults for its body slot, so the label is measured in the font it is drawn in
 * @returns The label rectangle in local coordinates (the shape's centre is the origin), anchored top-left
 */
export const calcAwsGroupLabelRegion: ObjectDocLabelRegionCalculator<
	AwsGroupLabelBox
> = (box, body, typeDefaults) => {
	const { width, height } = calcLabelTextBoxSize(body, typeDefaults);
	const rowCenterY =
		-box.height / 2 + AWS_GROUP_PADDING + AWS_GROUP_CORNER_ICON_SIZE / 2;

	return {
		x: calcLabelLeft(box),
		y: rowCenterY - height / 2,
		width,
		height,
	};
};
