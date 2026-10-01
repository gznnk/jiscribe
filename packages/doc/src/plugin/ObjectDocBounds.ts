import type { Rect } from "@jiscribe/geometry";

/**
 * How a type answers for the box its document implies: the axis-aligned rectangle
 * in world coordinates, top-left form, with the object's rotation ignored — the
 * same box `getObjectBounds` answers with, which is what placement, alignment,
 * distribution and overlap checks work on.
 *
 * Only a type whose geometry does not settle the box declares one, which today
 * means every `geometry: "point"` type: such a doc stores the corner the shape is
 * drawn from and no size at all, so there is nothing for the shared rules to read
 * (see GeometryType). The other geometries leave it out and are measured from the
 * fields they store.
 *
 * The doc it is handed may state only what the file states — the ops measure a
 * loaded doc, a factory a doc with the type's defaults merged in — so a
 * measurement leaning on one of those defaults (the font a `text` falls back to, a
 * cell's typography) resolves it itself.
 *
 * @param doc - The object as the document holds it, as a plain record: a field that is absent or not of its declared type is read as its own default, never assumed present
 * @returns The box in world coordinates, or null for a doc there is no box to measure from, which leaves the object out of every op working off one
 */
export type ObjectDocBoundsResolver = (
	doc: Readonly<Record<string, unknown>>,
) => Rect | null;
