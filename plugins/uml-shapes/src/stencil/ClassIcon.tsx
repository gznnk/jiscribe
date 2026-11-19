import { createStencilIcon } from "@jiscribe/canvas-sdk";

import { UmlIconFrame, UmlIconTitleDivider } from "./UmlIconParts";

/** Mark: a second divider and nothing else, so the three compartments of a class are what is read. */
export const ClassIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<UmlIconTitleDivider />
		<line
			x1="3"
			y1="15"
			x2="21"
			y2="15"
			stroke="currentColor"
			strokeWidth="2"
		/>
	</>,
);
