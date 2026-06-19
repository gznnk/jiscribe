import { memo } from "react";

type ArrangeIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const SendBackwardIconComponent: React.FC<ArrangeIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Send Backward",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<polygon points="4,6 12,17 20,6" fill={fill} />
	</svg>
);

export const SendBackwardIcon = memo(SendBackwardIconComponent);
