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
				d="M4 4 L16 4 L20 8 L20 20 L4 20 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				strokeLinejoin="round"
			/>
			<path
				d="M16 4 L16 8 L20 8"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const StickyIcon = memo(StickyIconComponent);
