import { DEFAULT_FONT_FAMILY } from "../../../../../constants/defaultFontFamily";
import { TEXT_LINE_HEIGHT } from "../../../../../constants/textLineHeight";

/** Default label style (fallback when the ConnectorLabel has no value). */
export const CONNECTOR_LABEL_DEFAULTS = {
	fontColor: "auto",
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const;

/** Inner padding around the text (padding of the box including the background knockout). */
export const CONNECTOR_LABEL_PADDING_X = 6;
export const CONNECTOR_LABEL_PADDING_Y = 2;

/** Minimum and maximum label box width (content width + padding, in world units). */
export const CONNECTOR_LABEL_MIN_WIDTH = 16;
export const CONNECTOR_LABEL_MAX_WIDTH = 240;

export type ConnectorLabelFont = {
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
};

// Offscreen canvas dedicated to measurement (measures width without triggering DOM layout).
let measureCanvas: HTMLCanvasElement | null = null;

const getMeasureContext = (): CanvasRenderingContext2D | null => {
	if (typeof document === "undefined") {
		return null;
	}
	if (!measureCanvas) {
		measureCanvas = document.createElement("canvas");
	}
	return measureCanvas.getContext("2d");
};

/** Measure the width of each line split by newline. Uses canvas 2d to avoid triggering DOM layout. */
const measureLineWidths = (
	lines: readonly string[],
	font: ConnectorLabelFont,
): number[] => {
	const ctx = getMeasureContext();
	if (!ctx) {
		// When measurement is unavailable (non-browser environment), fall back to a rough estimate from character count.
		return lines.map((line) => line.length * font.fontSize * 0.6);
	}
	ctx.font = `${font.fontWeight} ${font.fontSize}px ${font.fontFamily}`;
	return lines.map((line) => ctx.measureText(line).width);
};

export type ConnectorLabelBox = { width: number; height: number };

/**
 * Compute the label box dimensions (including padding).
 *
 * Width is the longest line + horizontal padding, clamped to the min/max width. Height is
 * computed by estimating the number of lines wrapped at the max width (explicit newlines +
 * automatic wrapping), so display is not clipped under either horizontal stretch or
 * wrapping. `borderWidth` is added to the dimensions to compensate for the border-box
 * eating into the inner area.
 */
export const calcConnectorLabelBox = (
	text: string,
	font: ConnectorLabelFont,
	borderWidth = 0,
): ConnectorLabelBox => {
	const lines = text.length === 0 ? [""] : text.split("\n");
	const lineWidths = measureLineWidths(lines, font);
	const maxLineWidth = lineWidths.reduce((max, w) => Math.max(max, w), 0);

	// The border eats into the inside of the border-box, so add the border amount horizontally and vertically to avoid clipping the text.
	const border = borderWidth * 2;

	const width =
		Math.min(
			CONNECTOR_LABEL_MAX_WIDTH,
			Math.max(
				CONNECTOR_LABEL_MIN_WIDTH,
				maxLineWidth + CONNECTOR_LABEL_PADDING_X * 2,
			),
		) + border;

	// Estimate the displayed line count after wrapping (each logical line grows by the amount it exceeds the available width).
	const availableWidth = Math.max(
		1,
		width - CONNECTOR_LABEL_PADDING_X * 2 - border,
	);
	const visualLineCount = lineWidths.reduce(
		(count, w) => count + Math.max(1, Math.ceil(w / availableWidth)),
		0,
	);

	const height =
		visualLineCount * font.fontSize * TEXT_LINE_HEIGHT +
		CONNECTOR_LABEL_PADDING_Y * 2 +
		border;

	return { width, height };
};
