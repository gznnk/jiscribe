import { DEFAULT_FONT_FAMILY } from "../../../../../constants/fontFamilies";
import type { ConnectorLabel } from "../../../../../schemas/objects/connector/ConnectorDoc";
import { calcTextBlockSize } from "../../../../../states/objects/utils/calcTextBlockSize";
import type { TextMeasureFont } from "../../../../../text/measureText";

/** Default label style (fallback when the ConnectorLabel has no value). */
export const CONNECTOR_LABEL_DEFAULTS = {
	fontColor: "auto",
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const;

/** The label's font, in the shape the shared measurement takes it (see measureText). */
export type ConnectorLabelFont = TextMeasureFont;

export type ConnectorLabelBox = { width: number; height: number };

/**
 * Compute the label box dimensions (including padding).
 *
 * The label is laid out as authored (calcTextBlockSize): it grows sideways with
 * the longest line and breaks only where the author typed a newline, so a long
 * label runs alongside its connector rather than stacking up over it. Nothing
 * wraps, which is what lets the height follow from the lines alone.
 *
 * @param text - The label; an empty one still yields the minimum box, which is what the editor opens on
 * @param font - Font the label is drawn with; a family other than the drawn one skews the width
 * @param borderWidth - Stroke of the label's own border in world units, added on all four sides because the border-box eats into the inner area; 0 for a borderless label
 * @returns The box size in world units, padding and border included
 */
export const calcConnectorLabelBox = (
	text: string,
	font: ConnectorLabelFont,
	borderWidth = 0,
): ConnectorLabelBox => {
	const border = borderWidth * 2;
	const { width, height } = calcTextBlockSize(text, font);
	return { width: width + border, height: height + border };
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
 */
export const resolveConnectorLabelBox = (
	label: ConnectorLabel,
): ConnectorLabelBox =>
	calcConnectorLabelBox(
		label.text,
		{
			fontSize: label.fontSize ?? CONNECTOR_LABEL_DEFAULTS.fontSize,
			fontFamily: CONNECTOR_LABEL_DEFAULTS.fontFamily,
			fontWeight: label.fontWeight ?? CONNECTOR_LABEL_DEFAULTS.fontWeight,
		},
		label.strokeWidth ?? 0,
	);
