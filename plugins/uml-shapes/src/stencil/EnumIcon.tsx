import { createStencilIcon } from "@jiscribe/canvas-sdk";

import { UmlIconFrame, UmlIconTitleDivider } from "./UmlIconParts";

/** Mark: three short rows, for the one-word values an enum lists. */
export const EnumIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<UmlIconTitleDivider />
		<line
			x1="6"
			y1="12"
			x2="13"
			y2="12"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="6"
			y1="15"
			x2="13"
			y2="15"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="6"
			y1="18"
			x2="13"
			y2="18"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</>,
);
