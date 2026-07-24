import { memo } from "react";

type DiamondIconProps = {
	width?: number;
	height?: number;
};

const DiamondIconComponent: React.FC<DiamondIconProps> = ({
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
				points="12,3 21,12 12,21 3,12"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const DiamondIcon = memo(DiamondIconComponent);
