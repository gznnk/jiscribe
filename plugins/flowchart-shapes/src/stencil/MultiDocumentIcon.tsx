import { createStencilIcon } from "@jiscribe/canvas-sdk";

/**
 * One sheet behind the front one, not the two the shape draws: a third at this
 * stroke weight closes the gaps between them at 24px.
 */
export const MultiDocumentIcon = createStencilIcon(
	<>
		<path
			d="M7 8.5 V4.5 H21 V14 H17"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
		<path
			d="M3 8.5 H17 V17.5 Q14.5 20.5 10 17.5 Q5.5 14.5 3 17.5 Z"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
	</>,
);
