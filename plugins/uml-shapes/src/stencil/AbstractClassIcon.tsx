import { createStencilIcon } from "@jiscribe/canvas-sdk";

import { UmlIconFrame, UmlIconTitleDivider } from "./UmlIconParts";

/**
 * Mark: a slanted A in the body, after UML's convention of setting an abstract
 * type's name in italics. The shape itself marks it with the stereotype.
 */
export const AbstractClassIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<UmlIconTitleDivider />
		<path
			d="M8.5 18.5 L13.5 11.5 L15.5 18.5 M10.6 16 H14.8"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
	</>,
);
