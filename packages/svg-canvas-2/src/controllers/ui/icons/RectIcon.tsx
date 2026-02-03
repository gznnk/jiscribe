import { memo } from "react";

type RectIconProps = {
	fill?: string;
	width?: number;
	height?: number;
};

const RectIconComponent: React.FC<RectIconProps> = ({
	fill = "#374151",
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
			<rect
				x="3"
				y="5"
				width="18"
				height="14"
				rx="2"
				ry="2"
				fill="none"
				stroke={fill}
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const RectIcon = memo(RectIconComponent);
