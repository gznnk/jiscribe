/**
 * Which box a body text's vertical alignment (`verticalAlign`) is measured
 * against.
 *
 * - `"region"`: the region the type declares
 *   (`ObjectDocDefinition.textRegion`), which each type insets to keep text off
 *   its own decoration — a cylinder's caps, a document's wavy foot. Since those
 *   insets differ per type, two types drawn at one height put their text on
 *   different optical centres.
 * - `"frame"`: the shape's whole height, the region's horizontal extent kept as
 *   it is (so a rounded end still keeps text away from the edge). Types drawn at
 *   one height then centre their text alike and read as a row.
 */
export const TextVerticalBases = ["region", "frame"] as const;

/** Box a body text's vertical alignment is measured against (see {@link TextVerticalBases}). */
export type TextVerticalBasis = (typeof TextVerticalBases)[number];

/**
 * Type guard for {@link TextVerticalBasis}.
 *
 * @param value - The value to check; anything but one of the two basis names is false, `undefined` included (an absent basis is the caller's to read as "region", the behaviour of every document written before the field existed)
 * @returns True if the value is a valid TextVerticalBasis
 */
export const isTextVerticalBasis = (
	value: unknown,
): value is TextVerticalBasis =>
	TextVerticalBases.includes(value as TextVerticalBasis);
