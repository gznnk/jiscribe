import { memo } from "react";

type ZoneIconProps = {
	width?: number;
	height?: number;
};

const ZoneIconComponent: React.FC<ZoneIconProps> = ({
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
				y="4"
				width="18"
				height="16"
				rx="1"
				fill="currentColor"
				fillOpacity="0.15"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<line
				x1="3"
				y1="9"
				x2="21"
				y2="9"
				stroke="currentColor"
				strokeWidth="2"
			/>
		</svg>
	);
};

export const ZoneIcon = memo(ZoneIconComponent);
