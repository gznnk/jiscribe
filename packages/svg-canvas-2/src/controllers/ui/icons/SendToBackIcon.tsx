import { memo } from "react";

type ArrangeIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const SendToBackIconComponent: React.FC<ArrangeIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Send to Back",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<polygon points="4,3 12,13 20,3" fill={fill} />
		<polygon points="4,12 12,21 20,12" fill={fill} />
	</svg>
);

export const SendToBackIcon = memo(SendToBackIconComponent);
