import { memo } from "react";

type GroupIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const GroupIconComponent: React.FC<GroupIconProps> = ({
	width = 20,
	height = 20,
	fill = "#333333",
	title = "Group",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		{/* Outer frame */}
		<rect
			x="3"
			y="3"
			width="18"
			height="18"
			stroke={fill}
			strokeWidth="2"
			fill="none"
		/>
		{/* Corner squares */}
		<rect x="1" y="1" width="3" height="3" fill={fill} />
		<rect x="20" y="1" width="3" height="3" fill={fill} />
		<rect x="1" y="20" width="3" height="3" fill={fill} />
		<rect x="20" y="20" width="3" height="3" fill={fill} />
		{/* Back square */}
		<rect
			x="7"
			y="10"
			width="7"
			height="7"
			stroke={fill}
			strokeWidth="2"
			fill="white"
		/>
		{/* Front square */}
		<rect
			x="10"
			y="7"
			width="7"
			height="7"
			stroke={fill}
			strokeWidth="2"
			fill="white"
		/>
	</svg>
);

export const GroupIcon = memo(GroupIconComponent);
