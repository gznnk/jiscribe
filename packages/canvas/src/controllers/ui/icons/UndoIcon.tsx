import { memo } from "react";

type UndoIconProps = {
	width?: number;
	height?: number;
};

/**
 * Undo icon: an arrow leaving to the left and curling back under itself.
 * Mirror image of {@link RedoIcon}, so the pair reads as one direction each.
 */
const UndoIconComponent: React.FC<UndoIconProps> = ({
	width = 20,
	height = 20,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
		>
			<path
				d="M4 9h9a5 5 0 0 1 0 10H9"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M8 5 4 9l4 4"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const UndoIcon = memo(UndoIconComponent);
