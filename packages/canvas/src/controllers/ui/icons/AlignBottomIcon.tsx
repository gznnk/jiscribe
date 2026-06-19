import { memo } from "react";

type AlignBottomIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const AlignBottomIconComponent: React.FC<AlignBottomIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Align Bottom",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		<path
			d="M3 20 L21 20"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<path
			d="M12 4 L12 16"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<path d="M12 17 L18 11 L6 11 Z" fill={fill} />
	</svg>
);

export const AlignBottomIcon = memo(AlignBottomIconComponent);
