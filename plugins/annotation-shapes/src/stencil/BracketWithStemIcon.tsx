import { memo } from "react";

type BracketWithStemIconProps = {
	width?: number;
	height?: number;
};

/**
 * The default `left` bracket with its stem at the stencil size. Hand-written
 * rather than built from buildBracketWithStemPath, so the icon keeps its own
 * optical margins as the path construction changes.
 */
const BracketWithStemIconComponent: React.FC<BracketWithStemIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M17 2 L12 2 L12 22 L17 22 M12 12 L7 12"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const BracketWithStemIcon = memo(BracketWithStemIconComponent);
