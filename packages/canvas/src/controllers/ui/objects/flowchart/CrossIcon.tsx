import { memo } from "react";

type CrossIconProps = {
	width?: number;
	height?: number;
};

const CrossIconComponent: React.FC<CrossIconProps> = ({
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
				points="9,4 15,4 15,9 20,9 20,15 15,15 15,20 9,20 9,15 4,15 4,9 9,9"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const CrossIcon = memo(CrossIconComponent);
