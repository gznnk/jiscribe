import { memo } from "react";

type EllipseIconProps = {
	fill?: string;
	width?: number;
	height?: number;
};

const EllipseIconComponent: React.FC<EllipseIconProps> = ({
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
			<ellipse
				cx="12"
				cy="12"
				rx="9"
				ry="7"
				fill="none"
				stroke={fill}
				strokeWidth="2"
			/>
		</svg>
	);
};

export const EllipseIcon = memo(EllipseIconComponent);
