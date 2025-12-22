/**
 * Available arrow head types.
 */
export const ArrowHeadTypes = [
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
 * Defines the available shapes for arrow heads in diagram connections.
 * These types determine the visual appearance of connection endpoints.
 * Includes standard arrows and UML relationship markers.
 */
export type ArrowHeadType = (typeof ArrowHeadTypes)[number];
