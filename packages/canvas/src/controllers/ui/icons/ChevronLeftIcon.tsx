import { memo } from "react";

type ChevronLeftIconProps = {
	width?: number;
	height?: number;
};

/** Back chevron, drawn pointing left. */
const ChevronLeftIconComponent: React.FC<ChevronLeftIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="m15 18-6-6 6-6"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const ChevronLeftIcon = memo(ChevronLeftIconComponent);
