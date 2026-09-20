import { memo, useId } from "react";

import { calcMixedColorSegments } from "../utils/calcMixedColorSegments";
import { isTransparentPreviewColor } from "./utils/isTransparentPreviewColor";
import {
	calcClockSectorPath,
	calcSegmentClockAngles,
} from "./utils/mixedColorArcs";
import { theme } from "../../../theme/themeTokens";

type ColorPreviewIconProps = {
	color: string;
	/**
	 * The colors of a selection that disagrees, already resolved
	 * (resolveAutoColor). The circle is then split into slices of the first
	 * three (MAX_MIXED_COLOR_SEGMENTS), starting straight down and running
	 * clockwise, and `color` is ignored. Omitted draws `color` alone.
	 */
	mixedColors?: readonly string[];
	size?: number;
	title?: string;
};

const RADIUS = 10;
const CENTER = 12;
const OUTLINE_COLOR = "rgba(128, 128, 128, 0.5)";

/**
 * Color preview icon (a filled circle).
 * Displays a filled circle indicating the current color, or split between the
 * colors of a selection that disagrees.
 * When transparent, displays a checker pattern instead.
 */
const ColorPreviewIconComponent: React.FC<ColorPreviewIconProps> = ({
	color,
	mixedColors,
	size = 24,
	title = "Color",
}) => {
	// One per icon: several of them are on screen at once, and a shared id
	// would let one icon's fill point at another's pattern.
	const transparentPatternId = `${useId()}-transparent`;
	const segments =
		mixedColors === undefined ? undefined : calcMixedColorSegments(mixedColors);
	const shownColors = segments?.map((segment) => segment.color) ?? [color];
	// fill may hold var(--jiscribe-*) (the auto-fill surface color).
	// var() is not resolved in presentation attributes, so apply it via style.
	const toFillStyle = (shownColor: string): React.CSSProperties => ({
		fill: isTransparentPreviewColor(shownColor)
			? `url("#${transparentPatternId}")`
			: shownColor,
	});

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			{shownColors.some(isTransparentPreviewColor) && (
				<defs>
					<pattern
						id={transparentPatternId}
						x="0"
						y="0"
						width="8"
						height="8"
						patternUnits="userSpaceOnUse"
					>
						{/* Overlay the foreground color faintly on only the two diagonal cells,
						    leaving the rest transparent (the surface shows through) → the checker
						    contrast auto-inverts with the theme.
						    color-mix is not resolved in presentation attributes, so specify it via style. */}
						<rect
							x="0"
							y="0"
							width="4"
							height="4"
							style={{ fill: theme.transparentChecker }}
						/>
						<rect
							x="4"
							y="4"
							width="4"
							height="4"
							style={{ fill: theme.transparentChecker }}
						/>
					</pattern>
				</defs>
			)}
			{segments === undefined ? (
				<circle
					cx={CENTER}
					cy={CENTER}
					r={RADIUS}
					stroke={OUTLINE_COLOR}
					strokeWidth="1"
					style={toFillStyle(color)}
				/>
			) : (
				<>
					{segments.map((segment) => (
						<path
							key={segment.start}
							d={calcClockSectorPath(
								CENTER,
								CENTER,
								RADIUS,
								calcSegmentClockAngles(segment),
							)}
							style={toFillStyle(segment.color)}
						/>
					))}
					<circle
						cx={CENTER}
						cy={CENTER}
						r={RADIUS}
						fill="none"
						stroke={OUTLINE_COLOR}
						strokeWidth="1"
					/>
				</>
			)}
		</svg>
	);
};

export const ColorPreviewIcon = memo(ColorPreviewIconComponent);
