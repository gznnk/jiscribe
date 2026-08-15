import { createStencilIcon } from "@jiscribe/canvas-sdk";

import { UmlIconFrame, UmlIconTitleDivider } from "./UmlIconParts";

/** Mark: the lollipop circle of the UML interface notation, set in the body. */
export const InterfaceIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<UmlIconTitleDivider />
		<circle
			cx="12"
			cy="15"
			r="3.6"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
		/>
	</>,
);
