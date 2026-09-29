import { ARROW_STYLE_KEYS } from "../base/ArrowStyleDoc";
import { FILL_STYLE_KEYS } from "../base/FillStyleDoc";
import { RADIUS_STYLE_KEYS } from "../base/RadiusStyleDoc";
import { STROKE_STYLE_KEYS } from "../base/StrokeStyleDoc";
import type { ObjectFeatures } from "../types/ObjectFeatures";

/**
 * The field names of the style groups `features` enables — stroke / fill / radius
 * / arrow, the four that share their names between Doc and State and so read the
 * same in either direction. The single answer to "which style fields does a type
 * of these features own": the parser builds the names it accepts from it
 * (ObjectDocValidatorRegistry) and the canvas mappers pass exactly these through
 * (FrameMapper / PolyMapper), so a field the document may hold cannot be one the
 * mapper drops on the way to the state.
 *
 * geometry and transform are left out because the converters (convert* /
 * mapTransform*) rebuild them, and so is the whole text group: Doc and State
 * disagree on where its styling sits (flat on the Doc, inside each slot in the
 * State), so mapText* rebuilds it too.
 *
 * Because each key array is an exhaustive constant (`exhaustiveKeysOf`), adding a
 * field to any style Doc forces the constant to be updated (compile error), and
 * once updated the new field flows through every side that reuses these keys.
 *
 * @param features - The type's descriptor; only the four style flags are read, the
 *   geometry and the text kind having no say here
 * @returns A fresh array in group order (stroke, fill, radius, arrow), empty for a
 *   type enabling none of them
 */
export const collectStyleKeys = (
	features: ObjectFeatures,
): readonly string[] => [
	...(features.stroke ? STROKE_STYLE_KEYS : []),
	...(features.fill ? FILL_STYLE_KEYS : []),
	...(features.radius ? RADIUS_STYLE_KEYS : []),
	...(features.arrow ? ARROW_STYLE_KEYS : []),
];
