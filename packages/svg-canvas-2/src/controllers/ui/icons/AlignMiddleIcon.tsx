import { memo } from "react";

type AlignMiddleIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const AlignMiddleIconComponent: React.FC<AlignMiddleIconProps> = ({
	width = 20,
	height = 20,
	fill = "#333333",
	title = "Align Middle",
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
			d="M3 12 L21 12"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<path d="M12 0 L12 8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
		<path
			d="M12 16 L12 24"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<path d="M12 10 L6 4 L18 4 Z" fill={fill} />
		<path d="M12 14 L6 20 L18 20 Z" fill={fill} />
	</svg>
);

export const AlignMiddleIcon = memo(AlignMiddleIconComponent);
