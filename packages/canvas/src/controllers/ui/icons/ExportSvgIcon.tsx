import { memo } from "react";

type ExportSvgIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Icon for SVG (vector) export: a document with a downward arrow overlaid
 * with vector nodes. Used by the editable-SVG export button.
 */
const ExportSvgIconComponent: React.FC<ExportSvgIconProps> = ({
	width = 20,
	height = 20,
	fill = "currentColor",
	title = "Export SVG",
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
			<path
				d="M13 3H7a2 2 0 0 0-2 2v9"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path
				d="M13 3l6 6v3"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle cx="8" cy="18" r="1.6" stroke={fill} strokeWidth="1.6" />
			<circle cx="16" cy="18" r="1.6" stroke={fill} strokeWidth="1.6" />
			<path
				d="M9.6 18h4.8"
				stroke={fill}
				strokeWidth="1.6"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const ExportSvgIcon = memo(ExportSvgIconComponent);
