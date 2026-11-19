import { theme } from "../../../../foundation/theme/themeTokens";

/**
 * Stroke width in world units, shared by every selection outline: the object's own
 * frame (Outline) and the parts addressed inside it (ObjectPartOutline,
 * ConnectorLabelPartOutline). Not
 * compensated for zoom — the outline scales with the content it wraps.
 */
export const SELECTION_OUTLINE_WIDTH = 1.5;

/**
 * The tint inside a picked part's box: the accent faded to a wash the part's own
 * fill and text still read through. Shared by every part outline
 * (ObjectPartOutline, ConnectorLabelPartOutline).
 */
export const PART_SELECTION_FILL = `color-mix(in srgb, ${theme.handleAccent} 18%, transparent)`;
