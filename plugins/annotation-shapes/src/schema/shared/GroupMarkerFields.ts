import { isEnum, isNumber } from "@jiscribe/basic-validators";
import type { ExtraStylePropertyDescriptor } from "@jiscribe/doc";

/**
 * Directions a group marker can face. It faces *away* from what it groups, so
 * its arms reach the opposite edge of the box, where the grouped shapes sit: a
 * `left` marker is the typographic `{` / `[`, grouping what is to its right.
 */
export const GROUP_MARKER_DIRECTIONS = ["left", "right", "up", "down"] as const;

export type GroupMarkerDirection = (typeof GROUP_MARKER_DIRECTIONS)[number];

/** Direction used when the field is absent: the typographic `{` / `[`. */
export const GROUP_MARKER_DIRECTION_DEFAULT: GroupMarkerDirection = "left";

/** Tip position used when the field is absent: the middle of the span. */
export const GROUP_MARKER_TIP_POSITION_DEFAULT = 0.5;

/**
 * Empty band between the tip and the label box. Wider than the below-label gap
 * of the pictograms (BELOW_LABEL_GAP = 4), because the tip is a point rather
 * than a full edge and a label pressed against it reads as touching the marker.
 */
export const GROUP_MARKER_LABEL_GAP = 8;

/** Type guard for GroupMarkerDirection. */
export const isGroupMarkerDirection = isEnum(GROUP_MARKER_DIRECTIONS);

/** Type guard for the tip position: a number in [0, 1]. */
export const isGroupMarkerTipPosition = (value: unknown): value is number =>
	isNumber(value) && value >= 0 && value <= 1;

/** The field every group marker carries, in both its Doc and its State. */
export type GroupMarkerDirectionField = {
	/** Which way the marker faces, away from the grouped shapes. Omitted = "left". */
	direction?: GroupMarkerDirection;
};

/** The extra field carried by the markers whose tip can be moved along the span. */
export type GroupMarkerTipPositionField = {
	/**
	 * Where the tip sits along the span, 0..1 from the top for a left/right
	 * marker and from the left for an up/down one. Omitted = 0.5.
	 */
	tipPosition?: number;
};

/**
 * Both tip-placing fields together, for the readers that take either kind of
 * marker: each field is optional, so a plain bracket's state (no `tipPosition`)
 * satisfies it and falls back to the defaults.
 */
export type GroupMarkerTipFields = GroupMarkerDirectionField &
	GroupMarkerTipPositionField;

/**
 * Styleable descriptors for a marker with a movable tip, so a host can drive
 * both fields through `onPropertyUpdate` (there is no built-in menu section for
 * them yet).
 */
export const GROUP_MARKER_TIP_STYLE_PROPERTIES = {
	direction: { valueType: "string" },
	tipPosition: { valueType: "number" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;

/** The same, for a marker whose tip is pinned to the middle of the span. */
export const GROUP_MARKER_DIRECTION_STYLE_PROPERTY = {
	direction: GROUP_MARKER_TIP_STYLE_PROPERTIES.direction,
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;
