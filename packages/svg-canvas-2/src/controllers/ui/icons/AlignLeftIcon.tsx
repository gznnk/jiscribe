import { memo } from "react";

type AlignLeftIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const AlignLeftIconComponent: React.FC<AlignLeftIconProps> = ({
	width = 20,
	height = 20,
	fill = "#333333",
	title = "Align Left",
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
			d="M3 10 L14 10"
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
			d="M3 18 L14 18"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

export const AlignLeftIcon = memo(AlignLeftIconComponent);
