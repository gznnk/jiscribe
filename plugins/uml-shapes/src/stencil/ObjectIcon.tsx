import { createStencilIcon } from "@jiscribe/canvas-sdk";

import { UmlIconFrame } from "./UmlIconParts";

/**
 * Mark: the underlined name UML gives an instance, over an empty body. The title
 * band is taller than the other icons' so the name and its underline both clear
 * the divider.
 */
export const ObjectIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<line
			x1="7"
			y1="6.75"
			x2="17"
			y2="6.75"
			stroke="currentColor"
			strokeWidth="2"
		/>
		<line
			x1="7"
			y1="9.5"
			x2="17"
			y2="9.5"
			stroke="currentColor"
			strokeWidth="1"
		/>
		<line
			x1="3"
			y1="13"
			x2="21"
			y2="13"
			stroke="currentColor"
			strokeWidth="2"
		/>
	</>,
);
