import {
	CONNECTOR_LABEL_DEFAULTS,
	type ConnectorLabel,
} from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { calcTextBlockSize } from "@jiscribe/doc/text/block/calcTextBlockSize";
import type { TextMeasureFont } from "@jiscribe/doc/text/measure/TextMeasureFont";
import type { Point, Rect } from "@jiscribe/geometry";

import { calcConnectorLabelAnchor } from "./calcConnectorLabelAnchor";

/** The label's font, in the shape the shared measurement takes it (see TextMeasureFont). */
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

/** What a label's box is sized from, every omitted field resolved. */
export type ConnectorLabelMetrics = ConnectorLabelFont & {
	/** The border's width in world units; 0 for a borderless label. */
	strokeWidth: number;
};

/**
 * The font and border a label is drawn and sized with: CONNECTOR_LABEL_DEFAULTS
 * for an omitted font field, no border for an omitted `strokeWidth`.
 *
 * @param label - The label's stored fields, any of them omitted
 */
export const resolveConnectorLabelMetrics = (
	label: Pick<
		ConnectorLabel,
		"fontFamily" | "fontSize" | "fontWeight" | "strokeWidth"
	>,
): ConnectorLabelMetrics => ({
	fontSize: label.fontSize ?? CONNECTOR_LABEL_DEFAULTS.fontSize,
	fontFamily: label.fontFamily ?? CONNECTOR_LABEL_DEFAULTS.fontFamily,
	fontWeight: label.fontWeight ?? CONNECTOR_LABEL_DEFAULTS.fontWeight,
	strokeWidth: label.strokeWidth ?? 0,
});

/**
 * Label box dimensions for a stored label, resolving the style defaults the
 * renderer applies (resolveConnectorLabelMetrics).
 *
 * The single derivation shared by the renderer (ConnectorLabel.tsx), the
 * connector extent (calcConnectorBoundingBox) and the label's backdrop
 * (resolveLabelBackdrops), so the drawn box and the boxes the others reserve
 * cannot drift apart.
 *
 * @param label - Stored label; an omitted `fontFamily` / `fontSize` / `fontWeight`
 *   falls back to CONNECTOR_LABEL_DEFAULTS and an omitted `strokeWidth` means no border
 */
export const resolveConnectorLabelBox = (
	label: ConnectorLabel,
): ConnectorLabelBox => {
	const { strokeWidth, ...font } = resolveConnectorLabelMetrics(label);
	return calcConnectorLabelBox(label.text, font, strokeWidth);
};

/**
 * Where a label sits on its connector's drawn path: the anchor its box is
 * centered on, as the connector renderer draws it.
 *
 * @param points - The drawn path, source first, in world coordinates
 *   (listConnectorPathPoints)
 * @param label - The stored label; its `position` / `offset` fall back to
 *   CONNECTOR_LABEL_DEFAULTS
 * @returns The anchor in world coordinates, or null for an empty label (drawn
 *   as no box at all) or an empty path
 */
export const resolveConnectorLabelAnchor = (
	points: readonly Point[],
	label: ConnectorLabel,
): Point | null =>
	label.text === ""
		? null
		: calcConnectorLabelAnchor(points, label.position, label.offset);

/**
 * The label's box placed on its anchor: centered on it and never rotated, the
 * way ConnectorLabel draws it.
 *
 * @param anchor - The anchor in world coordinates (resolveConnectorLabelAnchor)
 * @param box - The box's size (resolveConnectorLabelBox)
 * @returns The box in world coordinates, top-left based
 */
export const placeConnectorLabelBox = (
	anchor: Point,
	box: ConnectorLabelBox,
): Rect => ({
	x: anchor.x - box.width / 2,
	y: anchor.y - box.height / 2,
	width: box.width,
	height: box.height,
});
