import { memo } from "react";

type StickyIconProps = {
	width?: number;
	height?: number;
};

const StickyIconComponent: React.FC<StickyIconProps> = ({
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
				d="M4 3 L15 3 L21 9 L21 21 L4 21 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinejoin="round"
			/>
			<path
				d="M15 3 L15 9 L21 9"
				fill="none"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const StickyIcon = memo(StickyIconComponent);
