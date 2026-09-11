import { memo } from "react";

type UndoIconProps = {
	width?: number;
	height?: number;
};

/**
 * Undo icon: an arrow leaving to the left and curling back under itself.
 * Mirror image of {@link RedoIcon}, so the pair reads as one direction each.
 *
 * Drawn at 24px with whole-number coordinates so the stroke-width 2 lines cover
 * whole pixels, like every other icon on the bar; scaled to 20px the straight
 * runs land on fractions and blur.
 */
const UndoIconComponent: React.FC<UndoIconProps> = ({
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
				d="M4 9h9a5 5 0 0 1 0 10H9M8 5 4 9l4 4"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const UndoIcon = memo(UndoIconComponent);
