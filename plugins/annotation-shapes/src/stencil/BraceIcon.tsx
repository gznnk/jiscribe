import { memo } from "react";

type BraceIconProps = {
	width?: number;
	height?: number;
};

/**
 * The default `left` brace at the stencil size. Hand-written rather than built
 * from buildBracePath, so the icon keeps its own optical margins as the path
 * construction changes.
 */
const BraceIconComponent: React.FC<BraceIconProps> = ({
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
				d="M17 2 Q12 2 12 7 Q12 12 7 12 Q12 12 12 17 Q12 22 17 22"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const BraceIcon = memo(BraceIconComponent);
