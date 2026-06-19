/**
 * Available arrow types.
 */
export const ArrowTypes = [
	"FilledTriangle",
	"ConcaveTriangle",
	"OpenArrow",
	"HollowTriangle",
	"FilledDiamond",
	"HollowDiamond",
	"Circle",
	"None",
] as const;

/**
 * Defines the available shapes for arrows in diagram connections.
 * These types determine the visual appearance of connection endpoints.
 * Includes standard arrows and UML relationship markers.
 */
export type ArrowType = (typeof ArrowTypes)[number];

export const isArrowType = (value: unknown): value is ArrowType =>
	ArrowTypes.includes(value as ArrowType);
