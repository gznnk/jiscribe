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
	"HollowCircle",
	"Cross",
	"CrowFootMany",
	"CrowFootOneMany",
	"CrowFootZeroMany",
	"CrowFootOne",
	"CrowFootZeroOne",
	"None",
] as const;

/**
 * Defines the available shapes for arrows in diagram connections.
 * These types determine the visual appearance of connection endpoints.
 * Includes standard arrows, UML relationship markers, and ER crow's foot
 * cardinality marks.
 *
 * Most names describe the shape (`HollowDiamond`, `Cross`). The `CrowFoot*`
 * family is named after the cardinality it denotes rather than its glyph,
 * because those five marks are only meaningful as a set: a shape-derived name
 * such as "DoubleBar" would not say when to use it, and the members share
 * primitives (bar, circle) that carry no meaning on their own.
 */
export type ArrowType = (typeof ArrowTypes)[number];

export const isArrowType = (value: unknown): value is ArrowType =>
	ArrowTypes.includes(value as ArrowType);
