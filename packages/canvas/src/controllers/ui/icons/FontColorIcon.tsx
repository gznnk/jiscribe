import { memo } from "react";

import { calcMixedColorSegments } from "../utils/calcMixedColorSegments";
import { isTransparentPreviewColor } from "./utils/isTransparentPreviewColor";
import { theme } from "../../../theme/themeTokens";

type FontColorIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	underlineColor?: string;
	/**
	 * The font colors of a selection that disagrees, already resolved
	 * (resolveAutoColor). The bar is then split into pieces of the first three
	 * (MAX_MIXED_COLOR_SEGMENTS), left to right, and `underlineColor` is
	 * ignored. Omitted draws `underlineColor` alone.
	 */
	mixedColors?: readonly string[];
	title?: string;
};

const BAR_X = 4;
const BAR_WIDTH = 16;
/** Space left between two pieces of a split bar. */
const BAR_SEGMENT_GAP = 1;

/**
 * Font color icon.
 * Displays the letter "A" with a color bar underneath.
 */
const FontColorIconComponent: React.FC<FontColorIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	underlineColor = "currentColor",
	mixedColors,
	title = "Font Color",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<text
			x="50%"
			y="45%"
			dominantBaseline="central"
			textAnchor="middle"
			fontFamily="Arial, Helvetica, sans-serif"
			fontSize="20"
			fontWeight="500"
			fill={fill}
		>
			A
		</text>
		{/* underlineColor may be var(--jiscribe-*) (the resolved result of auto), so apply it via style. */}
		{mixedColors === undefined ? (
			<rect
				x={BAR_X}
				y="20"
				width={BAR_WIDTH}
				height="2"
				rx="0.5"
				style={{ fill: underlineColor }}
			/>
		) : (
			// Each piece is its share of the bar plus one gap, less the gap it
			// leaves before the next, so the pieces still end flush at the bar's end.
			calcMixedColorSegments(mixedColors).map((segment) => (
				<rect
					key={segment.start}
					x={BAR_X + segment.start * (BAR_WIDTH + BAR_SEGMENT_GAP)}
					y="20"
					width={
						(segment.end - segment.start) * (BAR_WIDTH + BAR_SEGMENT_GAP) -
						BAR_SEGMENT_GAP
					}
					height="2"
					rx="0.5"
					style={{
						fill: isTransparentPreviewColor(segment.color)
							? theme.transparentChecker
							: segment.color,
					}}
				/>
			))
		)}
	</svg>
);

export const FontColorIcon = memo(FontColorIconComponent);
