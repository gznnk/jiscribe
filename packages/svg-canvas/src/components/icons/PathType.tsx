import type React from "react";

export type PathTypeProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * PathTypeIcon icon component
 */
const PathTypeIconComponent: React.FC<PathTypeProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title,
}) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
		>
			{title && <title>{title}</title>}
			{/* Linear, Bezier, Rounded path types visualization */}
			<path
				d="M 4,8 L 11,8"
				stroke={fill}
				strokeWidth="2"
				fill="none"
				strokeLinecap="round"
			/>
			<path
				d="M 4,12 Q 7.5,9 11,12"
				stroke={fill}
				strokeWidth="2"
				fill="none"
			/>
			<path
				d="M 4,16 L 7,16 Q 8,16 8,15 L 8,14 Q 8,13 9,13 L 11,13"
				stroke={fill}
				strokeWidth="2"
				fill="none"
			/>
			<circle cx="4" cy="8" r="1.5" fill={fill} />
			<circle cx="11" cy="8" r="1.5" fill={fill} />
			<circle cx="4" cy="12" r="1.5" fill={fill} />
			<circle cx="11" cy="12" r="1.5" fill={fill} />
			<circle cx="4" cy="16" r="1.5" fill={fill} />
			<circle cx="11" cy="13" r="1.5" fill={fill} />
		</svg>
	);
};

export const PathTypeIcon = PathTypeIconComponent;
