import { createStencilIcon } from "@workspace/canvas-sdk";

import { UmlIconFrame, UmlIconTitleDivider } from "./UmlIconParts";

/** Mark: a second divider, for the attribute and operation compartments a class has. */
export const ClassIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<UmlIconTitleDivider />
		<line
			x1="6"
			y1="12"
			x2="18"
			y2="12"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="3"
			y1="15"
			x2="21"
			y2="15"
			stroke="currentColor"
			strokeWidth="2"
		/>
		<line
			x1="6"
			y1="18"
			x2="14"
			y2="18"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</>,
);
