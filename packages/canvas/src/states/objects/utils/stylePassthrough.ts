import { FILL_STYLE_KEYS } from "../../../schemas/objects/base/FillStyleDoc";
import { RADIUS_STYLE_KEYS } from "../../../schemas/objects/base/RadiusStyleDoc";
import { STROKE_STYLE_KEYS } from "../../../schemas/objects/base/StrokeStyleDoc";
import { TEXT_STYLE_KEYS } from "../../../schemas/objects/base/TextStyleDoc";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";

/**
 * Collects the pass-through keys for the style groups enabled in `features`.
 * stroke / fill / text / radius share the same field names between Doc and State,
 * so they are direction-independent. geometry and transform are excluded here since
 * the converters (convert* / mapTransform*) rebuild them.
 *
 * Because each key array is an exhaustive constant (`exhaustiveKeysOf`), adding a field
 * to any style Doc forces the constant to be updated (compile error), and once updated the
 * new field flows through every mapper that reuses these keys. This is what keeps
 * allow-list pass-through in sync across the Frame and Poly mapper families.
 */
export const collectStyleKeys = (
	features: ObjectFeatures,
): readonly string[] => [
	...(features.stroke ? STROKE_STYLE_KEYS : []),
	...(features.fill ? FILL_STYLE_KEYS : []),
	...(features.text ? TEXT_STYLE_KEYS : []),
	...(features.radius ? RADIUS_STYLE_KEYS : []),
];

/** Extracts only the keys that `src` owns and that are included in the allow-list `keys`. */
export const pick = (
	src: Record<string, unknown>,
	keys: readonly string[],
): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(src, key)) {
			out[key] = src[key];
		}
	}
	return out;
};
