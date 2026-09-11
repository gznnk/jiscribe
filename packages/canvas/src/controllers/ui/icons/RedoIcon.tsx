import { memo } from "react";

type RedoIconProps = {
	width?: number;
	height?: number;
};

/**
 * Redo icon: an arrow leaving to the right and curling back under itself.
 * Mirror image of {@link UndoIcon}, so the pair reads as one direction each.
 */
const RedoIconComponent: React.FC<RedoIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
		>
			{/* One path, not a shaft and a head: the two overlap where they meet, and a
			    translucent disabled color would paint that overlap twice, darker. */}
			<path
				d="M20 9h-9a5 5 0 0 0 0 10h4m1-14 4 4-4 4"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const RedoIcon = memo(RedoIconComponent);
