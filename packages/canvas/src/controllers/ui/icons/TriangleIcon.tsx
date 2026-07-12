import { memo } from "react";

type TriangleIconProps = {
	width?: number;
	height?: number;
};

const TriangleIconComponent: React.FC<TriangleIconProps> = ({
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
				points="12,4 21,20 3,20"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const TriangleIcon = memo(TriangleIconComponent);
