import { memo } from "react";

type AlignTopIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const AlignTopIconComponent: React.FC<AlignTopIconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title = "Align Top",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		<path d="M3 4 L21 4" stroke={fill} strokeWidth="2" strokeLinecap="round" />
		<path
			d="M12 8 L12 20"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<path d="M12 7 L18 13 L6 13 Z" fill={fill} />
	</svg>
);

export const AlignTopIcon = memo(AlignTopIconComponent);
