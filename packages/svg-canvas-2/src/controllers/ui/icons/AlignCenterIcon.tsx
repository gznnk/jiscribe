import { memo } from "react";

type AlignCenterIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const AlignCenterIconComponent: React.FC<AlignCenterIconProps> = ({
	width = 20,
	height = 20,
	fill = "#333333",
	title = "Align Center",
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
			d="M7 10 L17 10"
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
			d="M7 18 L17 18"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

export const AlignCenterIcon = memo(AlignCenterIconComponent);
