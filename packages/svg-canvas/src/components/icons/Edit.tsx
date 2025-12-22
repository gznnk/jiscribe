import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Edit icon component
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for edit icon
 */
const EditComponent: React.FC<IconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<path
				d="M6.04 17.6c.05 0 .09 0 .14-.01l3.93-.69c.05-.01.09-.03.12-.07l9.93-9.93a.23.23 0 0 0 0-.33L16.27 2.69a.23.23 0 0 0-.33 0L6.01 12.62c-.04.04-.06.08-.07.12l-.69 3.94a.79.79 0 0 0 .22.7c.15.15.35.23.56.23zm1.58-4.09L15.98 5.04l1.72 1.72-8.49 8.49-2.08.37.37-2.09z"
				fill={fill}
			/>
			<rect x="3" y="20" width="18" height="2" rx="0.5" fill={fill} />
		</svg>
	);
};

export const Edit = memo(EditComponent);
