import { memo } from "react";

type PropertyPanelIconProps = {
	width?: number;
	height?: number;
};

/**
 * Sidebar icon for the toggle opening the properties panel: a frame with a
 * vertical divider near its right edge, standing for the panel taking that strip
 * off the canvas.
 *
 * Both lines sit on half-pixel coordinates so a stroke-width 2 line covers whole
 * pixels at 24px, matching the other toolbar icons.
 */
const PropertyPanelIconComponent: React.FC<PropertyPanelIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
		>
			<rect
				x="4"
				y="5"
				width="16"
				height="14"
				rx="2"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<path d="M15 5V19" stroke="currentColor" strokeWidth="2" />
		</svg>
	);
};

export const PropertyPanelIcon = memo(PropertyPanelIconComponent);
