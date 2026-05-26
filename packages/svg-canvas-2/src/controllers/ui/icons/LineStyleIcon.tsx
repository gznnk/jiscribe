import { memo } from "react";

type LineStyleIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const LineStyleIconComponent: React.FC<LineStyleIconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title = "Line Style",
}) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={width}
		height={height}
		viewBox="0 0 24 24"
		fill="none"
	>
		<title>{title}</title>
		<line x1="1" y1="6" x2="23" y2="6" stroke={fill} strokeWidth="2" />
		<line
			x1="1"
			y1="12"
			x2="23"
			y2="12"
			stroke={fill}
			strokeWidth="2"
			strokeDasharray="4,2"
		/>
		<line
			x1="1"
			y1="18"
			x2="23"
			y2="18"
			stroke={fill}
			strokeWidth="2"
			strokeDasharray="2,2"
		/>
	</svg>
);

export const LineStyleIcon = memo(LineStyleIconComponent);
