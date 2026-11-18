import { createStencilIcon } from "@jiscribe/canvas-sdk";

import { UmlIconFrame } from "./UmlIconParts";

/**
 * Mark: the underlined name UML gives an instance. The title band is taller
 * than the other icons' so the name and its underline both clear the divider.
 */
export const ObjectIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<line
			x1="7.5"
			y1="6.25"
			x2="16.5"
			y2="6.25"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="7.5"
			y1="8.5"
			x2="16.5"
			y2="8.5"
			stroke="currentColor"
			strokeWidth="1"
		/>
		<line
			x1="3"
			y1="11.5"
			x2="21"
			y2="11.5"
			stroke="currentColor"
			strokeWidth="2"
		/>
		<line
			x1="6"
			y1="16.25"
			x2="18"
			y2="16.25"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</>,
);
