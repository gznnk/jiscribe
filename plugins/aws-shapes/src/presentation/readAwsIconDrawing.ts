import type { CanvasColorScheme } from "@jiscribe/canvas";

import type { AwsIconEntry, AwsIconNode } from "../schema/icon/AwsIconNode";

/**
 * Picks which of an icon's renditions to draw on the ground the theme sets.
 *
 * The two renditions are AWS's own — the set ships a separate Dark drawing for
 * the General icons, the AWS Cloud group icons and AWS Marketplace, all of which
 * are dark ink meant for a white ground. Everything else is drawn in category
 * colours that read either way and has one rendition only.
 *
 * @param entry - the icon, whose `darkNodes` is absent unless the set ships one
 * @param colorScheme - the active theme's ground; anything but `"dark"` takes
 *   the light rendition
 * @returns the elements to draw, never empty for an icon of the shipped set
 */
export const readAwsIconDrawing = (
	entry: AwsIconEntry,
	colorScheme: CanvasColorScheme,
): readonly AwsIconNode[] =>
	colorScheme === "dark" ? (entry.darkNodes ?? entry.nodes) : entry.nodes;
