import { resolveAutoColor } from "@jiscribe/canvas-sdk";

import type { AwsGroupDashType } from "../schema/AwsGroupDoc";
import { readAwsGroupKindStyle } from "../schema/awsGroupKinds";

/** How to draw the border. Both are applied as CSS (either may hold a `var(--jiscribe-*)`). */
export type AwsGroupStroke = {
	/** Border colour, with `"auto"` already resolved to the theme's ink */
	strokeColor: string;
	/** SVG `stroke-dasharray`; undefined for a solid line */
	strokeDasharray?: string;
};

/**
 * Builds the `stroke-dasharray` for a line style. The same pattern canvas uses
 * inside createFrameObject (getStrokeDasharray), copied because that is not
 * public — out of step, the same "dashed" would come out differently on awsGroup
 * alone.
 */
const calcStrokeDasharray = (
	dashType: AwsGroupDashType,
	strokeWidth: number,
): string | undefined => {
	switch (dashType) {
		case "dashed":
			return `${strokeWidth * 4} ${strokeWidth * 4}`;
		case "dotted":
			return `${strokeWidth} ${strokeWidth * 2}`;
		case "solid":
			return undefined;
	}
};

/**
 * The one place the border's colour and line style are decided. The kind stands
 * in for the type-default rung of the three-rung resolution, and a value the
 * object itself wrote wins over it.
 *
 * The `shape.strokeColor` / `shape.strokeDasharray` createFrameObject hands over
 * go unused on awsGroup: they resolve through the one default a type can hold,
 * which cannot express nineteen kinds.
 *
 * @param ownStroke - the object's own `stroke`; undefined takes the kind's
 *   colour, and `"auto"` is resolved here as theme-following
 * @param ownDashType - the object's own `strokeDashType`; undefined takes the
 *   kind's line style
 * @param kind - which frame this is; undefined and anything unknown are treated
 *   as the default kind
 * @param strokeWidth - the resolved line width in px, which the dash and dot
 *   patterns scale with
 * @returns the colour and dasharray to hand the drawing as they are
 */
export const resolveAwsGroupStroke = (
	ownStroke: string | undefined,
	ownDashType: AwsGroupDashType | undefined,
	kind: string | undefined,
	strokeWidth: number,
): AwsGroupStroke => {
	const kindStyle = readAwsGroupKindStyle(kind);
	return {
		strokeColor: resolveAutoColor(ownStroke ?? kindStyle.strokeColor, "ink"),
		strokeDasharray: calcStrokeDasharray(
			ownDashType ?? kindStyle.strokeDashType,
			strokeWidth,
		),
	};
};
