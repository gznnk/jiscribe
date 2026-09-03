import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";

export const SvgFeatures = {
	type: "svg",
	geometry: "rect",
	transform: true,
	connectable: false,
} as const satisfies ObjectFeatures;

/**
 * Fields specific to SVG objects.
 * The content is opaque "inline SVG markup" that is sanitized at render time.
 *
 * The natural (scale-reference) size is not stored on the doc; it is derived
 * automatically at render time from the SVG's viewBox (falling back to the
 * width/height attributes, then to a default).
 */
export type SvgExtraDoc = {
	/** The raw, unsanitized inline SVG string. External references are stripped at render time. */
	svgText: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SvgDocBrand: unique symbol;

export type SvgDoc = CreateObjectType<
	typeof SvgFeatures,
	typeof SvgDocBrand,
	SvgExtraDoc
>;

/** Doc fields svg carries beyond the ones its features imply (see ObjectDocDefinition.extraKeys). */
export const SVG_EXTRA_KEYS = [
	"svgText",
] as const satisfies readonly (keyof SvgDoc)[];
