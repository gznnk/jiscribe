import { createStencilIcon } from "@jiscribe/canvas-sdk";

import { UmlIconFrame, UmlIconTitleDivider } from "./UmlIconParts";

/**
 * Mark: two rows, each a short stroke and a longer one, for the
 * `attribute = value` rows an instance lists.
 */
export const ObjectIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<UmlIconTitleDivider />
		<line
			x1="6"
			y1="13"
			x2="9.5"
			y2="13"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="12"
			y1="13"
			x2="18"
			y2="13"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="6"
			y1="17"
			x2="9.5"
			y2="17"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="12"
			y1="17"
			x2="18"
			y2="17"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</>,
);
