import { memo } from "react";

type OpenReferenceIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Open reference icon.
 * The usual "external link" glyph: a frame opened at its top-right corner and
 * an arrow leaving through it.
 */
const OpenReferenceIconComponent: React.FC<OpenReferenceIconProps> = ({
	width = 22,
	height = 22,
	fill = "currentColor",
	title = "Open reference",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 16 16"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		{/* Frame, left open where the arrow exits */}
		<path
			d="M9.5 2.5 H2.5 V13.5 H13.5 V6.5"
			stroke={fill}
			strokeWidth="1.3"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
		{/* Outgoing arrow */}
		<path
			d="M7.5 8.5 L13.5 2.5"
			stroke={fill}
			strokeWidth="1.3"
			strokeLinecap="round"
		/>
		<path d="M9 2.5 H13.5 V7 Z" fill={fill} />
	</svg>
);

export const OpenReferenceIcon = memo(OpenReferenceIconComponent);
