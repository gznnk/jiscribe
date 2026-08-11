import { createStencilIcon } from "@jiscribe/canvas-sdk";

import {
	UmlIconBodyRows,
	UmlIconFrame,
	UmlIconTitleDivider,
} from "./UmlIconParts";

/**
 * Mark: a dashed outline for the type that has no instances. The dash pattern
 * sums to 5.4, which divides the 70.3 perimeter of the frame close to evenly so
 * the corners do not land mid-dash.
 */
export const AbstractClassIcon = createStencilIcon(
	<>
		<UmlIconFrame strokeDasharray="3.24 2.16" />
		<UmlIconTitleDivider />
		<UmlIconBodyRows />
	</>,
);
