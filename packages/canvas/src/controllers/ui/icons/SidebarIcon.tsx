import { memo } from "react";

type SidebarIconProps = {
	/** Which edge of the canvas the panel takes its strip off. */
	edge: "left" | "right";
	width?: number;
	height?: number;
};

/**
 * Icon of a sidebar toggle: a frame with a vertical divider near one edge,
 * standing for the panel taking that strip off the canvas. The same drawing
 * serves both sidebars, so the two toggles on the bar are exact mirror images.
 *
 * The frame spans 18 × 16, the width of the rect stencil beside it and the
 * height of the other 24px command icons, so the two toggles do not read a size
 * smaller than the rest of the bar. Every coordinate is a whole number, so a
 * stroke-width 2 line covers whole pixels at 24px.
 */
const SidebarIconComponent: React.FC<SidebarIconProps> = ({
	edge,
	width = 24,
	height = 24,
}) => {
	const dividerX = edge === "left" ? 9 : 15;
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
		>
			<rect
				x="3"
				y="4"
				width="18"
				height="16"
				rx="2"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<path d={`M${dividerX} 4V20`} stroke="currentColor" strokeWidth="2" />
		</svg>
	);
};

export const SidebarIcon = memo(SidebarIconComponent);
