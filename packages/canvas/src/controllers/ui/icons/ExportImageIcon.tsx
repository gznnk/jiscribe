import { memo } from "react";

type ExportImageIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Image export icon (a picture with a downward arrow).
 * Used by the button that exports the canvas as PNG.
 */
const ExportImageIconComponent: React.FC<ExportImageIconProps> = ({
	width = 20,
	height = 20,
	fill = "currentColor",
	title = "Export PNG",
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
		>
			<title>{title}</title>
			<rect
				x="3"
				y="4"
				width="18"
				height="13"
				rx="2"
				stroke={fill}
				strokeWidth="2"
			/>
			<path
				d="M7 14l3-3 2.5 2.5L15 11l2 2"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M12 17v5m0 0l-2.5-2.5M12 22l2.5-2.5"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const ExportImageIcon = memo(ExportImageIconComponent);
