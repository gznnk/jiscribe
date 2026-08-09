import { DEFAULT_FONT_FAMILY } from "../../../../../constants/defaultFontFamily";
import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "../../../../../constants/textBoxPadding";
import { TEXT_LINE_HEIGHT } from "../../../../../constants/textLineHeight";
import type { ConnectorLabel } from "../../../../../schemas/objects/connections/connector/ConnectorDoc";
import type { TextMeasureFont } from "../../../../../utils/text/measureText";
import {
	calcVisualLineCount,
	measureTextWidth,
} from "../../../../../utils/text/measureText";

/** Default label style (fallback when the ConnectorLabel has no value). */
export const CONNECTOR_LABEL_DEFAULTS = {
	fontColor: "auto",
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const;

/** Minimum and maximum label box width (content width + padding, in world units). */
export const CONNECTOR_LABEL_MIN_WIDTH = 16;
export const CONNECTOR_LABEL_MAX_WIDTH = 240;

/** The label's font, in the shape the shared measurement takes it (see measureText). */
export type ConnectorLabelFont = TextMeasureFont;

export type ConnectorLabelBox = { width: number; height: number };

/**
 * Compute the label box dimensions (including padding).
 *
 * Width is the longest line + horizontal padding, clamped to the min/max width. Height is
 * the number of lines the text wraps to at that width (explicit newlines + automatic
 * wrapping, simulated by calcVisualLineCount so it matches the editing textarea's own
 * wrapping), so display is not clipped under either horizontal stretch or wrapping.
 * `borderWidth` is added to the dimensions to compensate for the border-box eating into
 * the inner area.
 */
export const calcConnectorLabelBox = (
	text: string,
	font: ConnectorLabelFont,
	borderWidth = 0,
): ConnectorLabelBox => {
	const lines = text.length === 0 ? [""] : text.split("\n");
	const maxLineWidth = lines.reduce(
		(max, line) => Math.max(max, measureTextWidth(line, font)),
		0,
	);

	// The border eats into the inside of the border-box, so add the border amount horizontally and vertically to avoid clipping the text.
	const border = borderWidth * 2;

	const width =
		Math.min(
			CONNECTOR_LABEL_MAX_WIDTH,
			Math.max(
				CONNECTOR_LABEL_MIN_WIDTH,
				maxLineWidth + TEXT_BOX_PADDING_X * 2,
			),
		) + border;

	// Count the displayed lines the same way the box lays them out, so a line that
	// wraps at a word boundary reserves the same height while editing and after.
	const availableWidth = width - TEXT_BOX_PADDING_X * 2 - border;
	const visualLineCount = calcVisualLineCount(text, font, availableWidth);

	const height =
		visualLineCount * font.fontSize * TEXT_LINE_HEIGHT +
		TEXT_BOX_PADDING_Y * 2 +
		border;

	return { width, height };
};

/**
 * Label box dimensions for a stored label, resolving the style defaults the
 * renderer applies (see CONNECTOR_LABEL_DEFAULTS).
 *
 * The single derivation shared by the renderer (ConnectorLabel.tsx) and the
 * connector extent (calcConnectorBoundingBox), so the drawn box and the box the
 * bbox reserves cannot drift apart.
 *
 * @param label - Stored label; an omitted `fontSize` / `fontWeight` falls back
 *   to CONNECTOR_LABEL_DEFAULTS and an omitted `strokeWidth` means no border
 * @param fontFamily - Concrete font string used for measurement. Callers with
 *   theme access (the renderer) pass the host theme's font; callers without one
 *   (the controller-side bbox) take the default, which only skews the measured
 *   width when a host overrides `CanvasTheme.fontFamily`
 */
export const resolveConnectorLabelBox = (
	label: ConnectorLabel,
	fontFamily: string = CONNECTOR_LABEL_DEFAULTS.fontFamily,
): ConnectorLabelBox =>
	calcConnectorLabelBox(
		label.text,
		{
			fontSize: label.fontSize ?? CONNECTOR_LABEL_DEFAULTS.fontSize,
			fontFamily,
			fontWeight: label.fontWeight ?? CONNECTOR_LABEL_DEFAULTS.fontWeight,
		},
		label.strokeWidth ?? 0,
	);
