// How tool result text is written, kept in one place. It is what lets applying
// to a document (canvasOps/) and applying to a mounted canvas (client/) return
// numbers in the same shape, and it sits directly under src/ because both read
// it (canvasOps/ depends on neither React nor the DOM, so neither does this).
//
// The AI writes the numbers it gets back straight into its next call, so how
// digits and units are lined up is what decides how readable a result is.

import type { Point, Rect } from "@jiscribe/geometry";

/** How a result sentence names an id; several are listed separated by commas */
export const quoteIds = (ids: readonly string[]): string =>
	ids.map((id) => `"${id}"`).join(", ");

/** Drops the digits of a measurement: it only has to be good enough for the AI to write back as a coordinate, and more precision than that is harder to read */
export const formatNumber = (value: number): string =>
	String(Math.round(value * 10) / 10);

/** A point in world coordinates; the unit is px and the form is the same order as addObject's x / y */
export const formatPoint = ({ x, y }: Point): string =>
	`(${formatNumber(x)}, ${formatNumber(y)})`;

/** Top-left plus size; every rect is returned written this way */
export const formatRect = ({ x, y, width, height }: Rect): string =>
	`${formatPoint({ x, y })} ${formatNumber(width)} x ${formatNumber(height)} px`;

/**
 * A rect with its right and bottom edges added. Deciding to "put this next to
 * that" takes the edge coordinates rather than the top-left and the size, so
 * result sentences that return a rect use this one.
 *
 * @param bounds - A rect in world coordinates; negative widths and heights are
 *   not expected
 */
export const describeRectEdges = (bounds: Rect): string =>
	`${formatRect(bounds)}, so the right edge is x ${formatNumber(bounds.x + bounds.width)} and the bottom edge y ${formatNumber(bounds.y + bounds.height)}`;
