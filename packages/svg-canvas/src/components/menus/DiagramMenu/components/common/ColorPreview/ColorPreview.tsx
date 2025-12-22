import type React from "react";
import { memo } from "react";

import { isTransparentColor } from "../../../../../../utils/core/isTransparentColor";

type ColorPreviewProps = {
	color: string;
	size?: number;
	title?: string;
};

/**
 * ColorPreview component.
 * Displays a filled circle icon with the given color.
 * Shows a checkered pattern for transparent colors.
 */
const ColorPreviewComponent: React.FC<ColorPreviewProps> = ({
	color,
	size = 24,
	title,
}) => {
	const isTransparent = isTransparentColor(color);

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			{title && <title>{title}</title>}
			{isTransparent && (
				<defs>
					<pattern
						id="color-preview-transparent-pattern"
						x="0"
						y="0"
						width="8"
						height="8"
						patternUnits="userSpaceOnUse"
					>
						<rect x="0" y="0" width="4" height="4" fill="#ccc" />
						<rect x="4" y="0" width="4" height="4" fill="#fff" />
						<rect x="0" y="4" width="4" height="4" fill="#fff" />
						<rect x="4" y="4" width="4" height="4" fill="#ccc" />
					</pattern>
				</defs>
			)}
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="#ddd"
				strokeWidth="1"
				fill={isTransparent ? "url(#color-preview-transparent-pattern)" : color}
			/>
		</svg>
	);
};

export const ColorPreview = memo(ColorPreviewComponent);
