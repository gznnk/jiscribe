import { createStencilIcon } from "@jiscribe/canvas-sdk";

/**
 * An entity: the frame, the line under the title band, a key column marked off
 * on the left by a short rule, and two rows beside it — the rule is what tells it
 * apart from the UML record's icon.
 */
export const ErEntityIcon = createStencilIcon(
	<>
		<rect
			x="3"
			y="3"
			width="18"
			height="18"
			rx="1"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		/>
		<line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
		<line
			x1="8"
			y1="9"
			x2="8"
			y2="21"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="10.5"
			y1="13"
			x2="18"
			y2="13"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="10.5"
			y1="17"
			x2="16"
			y2="17"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</>,
);
