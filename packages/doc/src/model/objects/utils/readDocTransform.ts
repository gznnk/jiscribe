import type { Transform } from "@jiscribe/geometry";

/**
 * The transform a doc applies to its own box, in the form the geometry helpers take.
 * Read off a plain record so a factory merging defaults and an op building a doc can
 * both hand over what they hold; a field that is absent or not of its declared type
 * is the identity (see TransformDoc).
 *
 * @param doc - The doc the box belongs to; only `rotation` (degrees), `flipX` and `flipY` are read
 * @returns The angle in degrees as stored (not normalised), and each scale -1 for a flip and 1 otherwise
 */
export const readDocTransform = (
	doc: Readonly<Record<string, unknown>>,
): Transform => ({
	rotation: typeof doc.rotation === "number" ? doc.rotation : 0,
	scaleX: doc.flipX === true ? -1 : 1,
	scaleY: doc.flipY === true ? -1 : 1,
});
