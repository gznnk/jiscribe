import { memo } from "react";

type ArrangeIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const BringForwardIconComponent: React.FC<ArrangeIconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title = "Bring Forward",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<polygon points="4,18 12,7 20,18" fill={fill} />
	</svg>
);

export const BringForwardIcon = memo(BringForwardIconComponent);
