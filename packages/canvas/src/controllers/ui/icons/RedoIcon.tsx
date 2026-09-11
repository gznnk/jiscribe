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
				d="M20 9h-9a5 5 0 0 0 0 10h4"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="m16 5 4 4-4 4"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const RedoIcon = memo(RedoIconComponent);
