import { createStencilIcon } from "@workspace/canvas-sdk";

import { UmlIconFrame, UmlIconTitleDivider } from "./UmlIconParts";

/** Mark: bulleted rows for the list of values. */
export const EnumIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<UmlIconTitleDivider />
		<circle cx="6.75" cy="12" r="1.1" fill="currentColor" stroke="none" />
		<circle cx="6.75" cy="15" r="1.1" fill="currentColor" stroke="none" />
		<circle cx="6.75" cy="18" r="1.1" fill="currentColor" stroke="none" />
		<line
			x1="9.75"
			y1="12"
			x2="18"
			y2="12"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="9.75"
			y1="15"
			x2="18"
			y2="15"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="9.75"
			y1="18"
			x2="18"
			y2="18"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</>,
);
