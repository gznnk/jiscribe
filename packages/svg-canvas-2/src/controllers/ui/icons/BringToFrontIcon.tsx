import { memo } from "react";

type ArrangeIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const BringToFrontIconComponent: React.FC<ArrangeIconProps> = ({
	width = 20,
	height = 20,
	fill = "#333333",
	title = "Bring to Front",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<polygon points="4,12 12,3 20,12" fill={fill} />
		<polygon points="4,21 12,11 20,21" fill={fill} />
	</svg>
);

export const BringToFrontIcon = memo(BringToFrontIconComponent);
