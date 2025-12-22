import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Gachapon machine icon component
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @returns SVG element for gachapon machine icon
 */
const GachaponComponent: React.FC<IconProps> = ({
	width = 80,
	height = 80,
	title,
}) => {
	return (
		<svg width={width} height={height} viewBox="0 0 80 80">
			<title>{title || "Gachapon"}</title>
			<rect x="0" y="0" width="80" height="80" rx="10" ry="10" fill="#eee" />
			<rect x="20" y="10" width="40" height="40" rx="5" ry="5" fill="#fff" />
			<rect x="20" y="50" width="40" height="10" rx="2" ry="2" fill="#ccc" />
			<rect x="35" y="60" width="10" height="10" fill="#999" />
			<rect x="27" y="16" width="18" height="18" fill="#3399FF" />
			<circle cx="47" cy="32" r="8" fill="#FF6666" />
			<polygon points="28,45 38,28 48,45" fill="#66FF66" />
		</svg>
	);
};

export const Gachapon = memo(GachaponComponent);
