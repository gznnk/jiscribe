import {
	calcLabelTextBoxSize,
	isRichText,
	richTextToPlain,
} from "@jiscribe/doc";
import type { TextSlot } from "@jiscribe/doc";
import type { Rect } from "@jiscribe/geometry";

import {
	AWS_GROUP_CORNER_ICON_SIZE,
	AWS_GROUP_HEADER_HEIGHT,
	AWS_GROUP_PADDING,
} from "./AwsGroupDoc";
import { readAwsGroupKindStyle } from "./awsGroupKinds";
import {
	AWS_GROUP_LABEL_STYLE_DEFAULTS,
	calcAwsGroupLabelLeft,
} from "./awsGroupLabelLayout";

/**
 * The part of the header band the corner badge and the label cover — the type's
 * `ObjectDocDefinition.layoutContainerTitleRegion`: from the frame's left edge to the
 * right edge of the label, placed and measured as the presentation draws it
 * (calcAwsGroupLabelTextRegion).
 *
 * @param doc - The frame as the document holds it; `width`, `height`, `kind`, `text` and the font fields are read, each as an unknown
 * @returns The region in local coordinates (shape centre as origin), top-left based and as tall as the header band, no wider than the box; it ends after the badge for an empty label, with width 0 when the kind draws no badge either; undefined when `width` or `height` is not a finite number
 */
export const calcAwsGroupTitleRegion = (
	doc: Readonly<Record<string, unknown>>,
): Rect | undefined => {
	const { width, height, kind, text } = doc;
	if (
		typeof width !== "number" ||
		!Number.isFinite(width) ||
		typeof height !== "number" ||
		!Number.isFinite(height)
	) {
		return undefined;
	}
	const frameKind = typeof kind === "string" ? kind : undefined;
	const left = -width / 2;
	const labelLeft = calcAwsGroupLabelLeft({ width, kind: frameKind });
	let right = left;
	if (isRichText(text) && richTextToPlain(text) !== "") {
		right =
			labelLeft +
			calcLabelTextBoxSize(
				doc as Partial<TextSlot>,
				AWS_GROUP_LABEL_STYLE_DEFAULTS,
			).width;
	} else if (readAwsGroupKindStyle(frameKind).cornerIcon !== undefined) {
		right = left + AWS_GROUP_PADDING + AWS_GROUP_CORNER_ICON_SIZE;
	}
	return {
		x: left,
		y: -height / 2,
		width: Math.min(right - left, width),
		height: AWS_GROUP_HEADER_HEIGHT,
	};
};
