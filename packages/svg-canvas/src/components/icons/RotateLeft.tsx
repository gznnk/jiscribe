import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Rotate left icon component
 *
 * @param props - Props for the icon
 * @param props.fill - SVG fill color
 * @returns SVG element for rotate left icon
 */
const RotateLeftComponent: React.FC<IconProps> = ({
	fill = "#333333",
	width = 24,
	height = 24,
	title,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title || "Rotate Left"}</title>
			<path
				d="M6.23714 2.0007C6.78902 2.02117 7.21979 2.48517 7.19932 3.03708L7.10149 5.67483C8.45447 4.62548 10.154 4.00001 12 4.00001C16.4183 4.00001 20 7.58174 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 11.4477 4.44771 11 5 11C5.55228 11 6 11.4477 6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12C18 8.68631 15.3137 6.00001 12 6.00001C10.4206 6.00001 8.98316 6.60994 7.91096 7.60891L11.3161 8.00677C11.8646 8.07087 12.2573 8.56751 12.1932 9.11607C12.1291 9.66462 11.6325 10.0574 11.0839 9.99326L5.88389 9.38567C5.36595 9.32514 4.9814 8.87659 5.00068 8.35536L5.20068 2.96295C5.22114 2.41104 5.68514 1.98023 6.23714 2.0007Z"
				fillRule="evenodd"
				clipRule="evenodd"
				fill={fill}
			/>
		</svg>
	);
};

RotateLeftComponent.displayName = "RotateLeft";

export const RotateLeft = memo(RotateLeftComponent);
