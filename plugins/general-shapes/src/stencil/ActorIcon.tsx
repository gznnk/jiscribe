import { createStencilIcon } from "@jiscribe/canvas-sdk";

export const ActorIcon = createStencilIcon(
	<>
		<circle
			cx="12"
			cy="5"
			r="3"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		/>
		<path
			d="M12 8 V15 M5 11 H19 M12 15 L7 21 M12 15 L17 21"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</>,
);
