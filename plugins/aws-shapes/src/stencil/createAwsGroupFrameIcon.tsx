import type { StencilIconProps } from "@jiscribe/canvas";
import { createStencilIcon } from "@jiscribe/canvas-sdk";
import type { NamedExoticComponent } from "react";

import type { AwsGroupDashType } from "../schema/AwsGroupDoc";

/** Line width inside the glyph, on createStencilIcon's 24-unit grid. */
const FRAME_STROKE_WIDTH = 2;

/** Pattern per line style, sized so the style still reads in the glyph's small frame. */
const DASH_ARRAYS: Readonly<Record<AwsGroupDashType, string | undefined>> = {
	solid: undefined,
	dashed: "5 4",
	dotted: "1 3",
};

type AwsGroupFrameIconParams = {
	/** Border colour; the kind's own colour as it is */
	strokeColor: string;
	/** Border line style */
	strokeDashType: AwsGroupDashType;
};

/**
 * The palette glyph for a kind with no corner badge: the frame alone, in the
 * kind's colour and line style. AWS itself tells an availability zone from a
 * security group by nothing but those two.
 *
 * @param params - the colour and line style the kind decided (awsGroupKinds.ts)
 * @returns the memoized component a `Stencil`'s `icon` takes
 */
export const createAwsGroupFrameIcon = ({
	strokeColor,
	strokeDashType,
}: AwsGroupFrameIconParams): NamedExoticComponent<StencilIconProps> =>
	createStencilIcon(
		<rect
			x="3"
			y="5"
			width="18"
			height="14"
			fill="none"
			stroke={strokeColor}
			strokeWidth={FRAME_STROKE_WIDTH}
			strokeDasharray={DASH_ARRAYS[strokeDashType]}
		/>,
	);
