import { memo } from "react";

type LoopLimitIconProps = {
	width?: number;
	height?: number;
};

const LoopLimitIconComponent: React.FC<LoopLimitIconProps> = ({
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
			<polygon
				points="8,5 16,5 21,10 21,19 3,19 3,10"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const LoopLimitIcon = memo(LoopLimitIconComponent);
