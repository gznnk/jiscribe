import { memo } from "react";

import { calcMixedColorSegments } from "../utils/calcMixedColorSegments";
import { isTransparentPreviewColor } from "./utils/isTransparentPreviewColor";
import {
	calcClockArcPath,
	calcSegmentClockAngles,
} from "./utils/mixedColorArcs";
import { theme } from "../../../theme/themeTokens";

type BorderColorIconProps = {
	color: string;
	/**
	 * The stroke colors of a selection that disagrees, already resolved
	 * (resolveAutoColor). The ring is then split into arcs of the first three
	 * (MAX_MIXED_COLOR_SEGMENTS), starting straight down and running clockwise,
	 * and `color` is ignored. Omitted draws `color` alone.
	 */
	mixedColors?: readonly string[];
	size?: number;
	title?: string;
};

const RADIUS = 8;
const CENTER = 12;
const RING_WIDTH = 3;
/** What each end of a split ring's arc is cut back by, in degrees, leaving a gap between the colors. */
const ARC_END_TRIM_DEGREES = 8;

/**
 * Border color icon (a hollow circle).
 * Displays a hollow circle indicating the current stroke color, or split
 * between the colors of a selection that disagrees.
 * For transparent, displays a checker-pattern stroke.
 */
const BorderColorIconComponent: React.FC<BorderColorIconProps> = ({
	color,
	mixedColors,
	size = 24,
	title = "Border Color",
}) => {
	const isTransparent = isTransparentPreviewColor(color);

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			{mixedColors !== undefined ? (
				calcMixedColorSegments(mixedColors).map((segment) => {
					const { startAngle, endAngle } = calcSegmentClockAngles(segment);
					return (
						<path
							key={segment.start}
							d={calcClockArcPath(CENTER, CENTER, RADIUS, {
								startAngle: startAngle + ARC_END_TRIM_DEGREES,
								endAngle: endAngle - ARC_END_TRIM_DEGREES,
							})}
							fill="none"
							strokeWidth={RING_WIDTH}
							// A transparent arc takes the checker's color, the ring being
							// too thin to hold the checker itself. The color may be
							// var(--jiscribe-*), so apply it via style.
							style={{
								stroke: isTransparentPreviewColor(segment.color)
									? theme.transparentChecker
									: segment.color,
							}}
						/>
					);
				})
			) : isTransparent ? (
				/* Transparent indicator: a dashed ring. The dash is a faint overlay of the
				   foreground color and the gap shows through, producing two tones whose
				   contrast auto-inverts with the theme.
				   color-mix is not resolved in presentation attributes, so specify it via style. */
				<circle
					cx={CENTER}
					cy={CENTER}
					r={RADIUS}
					fill="none"
					strokeWidth="4"
					strokeDasharray="3 2"
					style={{ stroke: theme.transparentChecker }}
				/>
			) : (
				/* color may be var(--jiscribe-*) (the resolved result of auto), so apply it via style. */
				<circle
					cx={CENTER}
					cy={CENTER}
					r={RADIUS}
					fill="none"
					strokeWidth={RING_WIDTH}
					style={{ stroke: color }}
				/>
			)}
		</svg>
	);
};

export const BorderColorIcon = memo(BorderColorIconComponent);
