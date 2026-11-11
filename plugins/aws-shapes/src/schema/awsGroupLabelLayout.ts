import { textStyleKeysOf } from "@jiscribe/doc";
import type { TextSlotStyle } from "@jiscribe/doc";

import {
	AWS_GROUP_CORNER_ICON_SIZE,
	AWS_GROUP_DOC_DEFAULTS,
	AWS_GROUP_LABEL_GAP,
	AWS_GROUP_PADDING,
	AwsGroupFeatures,
} from "./AwsGroupDoc";
import { readAwsGroupKindStyle } from "./awsGroupKinds";

// Where the frame's label starts and what it is measured with, declared once for the
// two sides that place it: the presentation (calcAwsGroupLabelTextRegion, what is
// drawn and edited) and the doc definition (calcAwsGroupTitleRegion, what a routed
// connector goes around).

/**
 * The typography the label is drawn with where the slot sets none: the type's
 * creation defaults read for the fields its text type accepts, the family left
 * out, as ObjectTextStyleDefaultsRegistry reads them for the overlay. Not the
 * shared caption ones (14px bold).
 */
export const AWS_GROUP_LABEL_STYLE_DEFAULTS: TextSlotStyle = Object.fromEntries(
	textStyleKeysOf(AwsGroupFeatures.text)
		.filter((key) => key !== "fontFamily")
		.flatMap((key) => {
			const value = (AWS_GROUP_DOC_DEFAULTS as TextSlotStyle)[key];
			return value === undefined ? [] : [[key, value]];
		}),
);

/**
 * Left edge of the label band: a kind with a corner badge starts that much
 * further right. Local coordinates, the shape's centre being the origin.
 *
 * @param frame - The untransformed box's `width` and the `kind` (omitted and unknown values read as the default kind)
 */
export const calcAwsGroupLabelLeft = (frame: {
	width: number;
	kind?: string;
}): number => {
	const hasCornerIcon =
		readAwsGroupKindStyle(frame.kind).cornerIcon !== undefined;
	return (
		-frame.width / 2 +
		AWS_GROUP_PADDING +
		(hasCornerIcon ? AWS_GROUP_CORNER_ICON_SIZE + AWS_GROUP_LABEL_GAP : 0)
	);
};
