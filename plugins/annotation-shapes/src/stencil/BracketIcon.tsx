import { memo } from "react";

type BracketIconProps = {
	width?: number;
	height?: number;
};

/**
 * The default `left` bracket at the stencil size. Hand-written rather than built
 * from buildBracketPath, so the icon keeps its own optical margins as the path
 * construction changes.
 */
const BracketIconComponent: React.FC<BracketIconProps> = ({
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
				d="M17 2 L7 2 L7 22 L17 22"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const BracketIcon = memo(BracketIconComponent);
