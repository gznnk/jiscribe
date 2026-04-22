import { memo } from "react";

type AlignRightIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const AlignRightIconComponent: React.FC<AlignRightIconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title = "Align Right",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		<path d="M3 6 L21 6" stroke={fill} strokeWidth="2" strokeLinecap="round" />
		<path
			d="M10 10 L21 10"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<path
			d="M3 14 L21 14"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<path
			d="M10 18 L21 18"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

export const AlignRightIcon = memo(AlignRightIconComponent);
