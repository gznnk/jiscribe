/**
 * The popovers the stencil rail opens beside itself (StencilRailPopover). Each
 * kind is also the id of the rail button toggling it (`toggle:{kind}`, read by
 * StencilRailHandler; the category buttons' own `toggle:` go to
 * StencilCategoryToggleHandler, so the two never meet).
 */
export const STENCIL_RAIL_POPOVER_KINDS = [
	"railOverflow",
	"railPresets",
] as const;

/** A popover of the stencil rail: its "…" overflow list, or its collapsed presets. */
export type StencilRailPopoverKind =
	(typeof STENCIL_RAIL_POPOVER_KINDS)[number];

/**
 * Whether a `toggle:` id names one of the rail's popovers.
 *
 * @param value - The id out of a `toggle:{id}` action on the rail
 */
export const isStencilRailPopoverKind = (
	value: string,
): value is StencilRailPopoverKind =>
	(STENCIL_RAIL_POPOVER_KINDS as readonly string[]).includes(value);
