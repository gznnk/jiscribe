import { memo, useMemo } from "react";

import { theme } from "../../../../constants/theme";

type GridPatternProps = {
	zoom: number;
	baseGridSize?: number;
	color?: string;
};

/**
 * SVG grid pattern component with adaptive multi-level grid system.
 * Similar to Miro, it shows:
 * - Medium grid lines at 25px intervals
 * - Bold grid lines at 100px intervals (4 x 25px)
 *
 * The grid adapts to zoom level, with medium lines becoming bold lines as you zoom out.
 */
const GridPatternComponent = ({
	zoom,
	baseGridSize = 25,
	color = theme.gridLine,
}: GridPatternProps): React.JSX.Element => {
	const gridConfig = useMemo(() => {
		// Fixed grid sizes in world coordinates
		// These don't change - only zoom changes how they appear on screen
		const baseLevel = Math.floor(Math.log(zoom) / Math.log(4));
		const scaleFactor = 4 ** baseLevel;

		const mediumGrid = baseGridSize / scaleFactor; // 20px at zoom=1
		const boldGrid = (baseGridSize * 4) / scaleFactor; // 80px at zoom=1

		// Calculate screen sizes for opacity transition
		const mediumGridScreenSize = mediumGrid * zoom;

		// Medium grid: smooth fade-in as grid gets larger (zooming in)
		// Fade in from 0 to 1 as screen size goes from 10px to 30px
		const mediumFadeStart = 10;
		const mediumFadeEnd = 30;
		const mediumOpacity = Math.max(
			0,
			Math.min(
				1,
				(mediumGridScreenSize - mediumFadeStart) /
					(mediumFadeEnd - mediumFadeStart),
			),
		);

		// Bold grid is always visible
		const boldOpacity = 1;

		// Both use same stroke width for consistency
		const strokeWidth = 1 / zoom;

		return {
			mediumGrid,
			boldGrid,
			mediumOpacity,
			boldOpacity,
			strokeWidth,
		};
	}, [zoom, baseGridSize]);

	return (
		// The whole grid defs block is excluded from PNG/SVG export
		<defs data-canvas-export="exclude">
			{/* Medium grid pattern (20px) */}
			<pattern
				id="grid-medium"
				width={gridConfig.mediumGrid}
				height={gridConfig.mediumGrid}
				patternUnits="userSpaceOnUse"
			>
				<path
					d={`M ${gridConfig.mediumGrid} 0 L 0 0 0 ${gridConfig.mediumGrid}`}
					fill="none"
					stroke={color}
					strokeWidth={gridConfig.strokeWidth}
					opacity={gridConfig.mediumOpacity}
				/>
			</pattern>

			{/* Bold grid pattern (100px) */}
			<pattern
				id="grid-bold"
				width={gridConfig.boldGrid}
				height={gridConfig.boldGrid}
				patternUnits="userSpaceOnUse"
			>
				<path
					d={`M ${gridConfig.boldGrid} 0 L 0 0 0 ${gridConfig.boldGrid}`}
					fill="none"
					stroke={color}
					strokeWidth={gridConfig.strokeWidth}
					opacity={gridConfig.boldOpacity}
				/>
			</pattern>

			{/* Combined grid pattern */}
			<pattern
				id="grid"
				width={gridConfig.boldGrid}
				height={gridConfig.boldGrid}
				patternUnits="userSpaceOnUse"
			>
				<rect
					width={gridConfig.boldGrid}
					height={gridConfig.boldGrid}
					fill="url(#grid-medium)"
				/>
				<rect
					width={gridConfig.boldGrid}
					height={gridConfig.boldGrid}
					fill="url(#grid-bold)"
				/>
			</pattern>
		</defs>
	);
};

export const GridPattern = memo(GridPatternComponent);
