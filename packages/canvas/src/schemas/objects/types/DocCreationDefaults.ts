/**
 * Theme-derived defaults applied when a new ObjectDoc is created.
 *
 * Unlike `overrides` (per-preset values that always win), these are ambient
 * defaults injected by the host theme (Canvas `theme` prop). Each ShapeFactory
 * applies only the entries its shape actually declares in its DOC_DEFAULTS,
 * so theme defaults never add fields to shapes that do not support them
 * (e.g. fontFamily on a polyline).
 */
export type DocCreationDefaults = {
	/** Default fontFamily for text-bearing shapes. */
	fontFamily: string;
};
