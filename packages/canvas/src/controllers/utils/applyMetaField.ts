import { mergeMetaDoc } from "@jiscribe/doc/model/objects/utils/mergeMetaDoc";

import type { MetaState } from "../../states/objects/base/MetaState";
import { rebrand } from "../../states/objects/utils/rebrand";
import type { MetaProperty } from "../reducer/CanvasActions";

/**
 * A `meta` with one of its two sidebar fields stated, by the rule an object's note
 * and the document's own are both written by (`mergeMetaDoc`, shared with the
 * headless `setMeta` op): null and `""` drop the field, every other member is
 * kept, and a `meta` left with no member is undefined.
 *
 * @param srcMeta - The note as it stands; undefined when there is none
 * @param property - Which of the two fields is being stated
 * @param value - The text to state, or null (or `""`) to drop the field
 * @returns `srcMeta` itself when it already says the same thing, otherwise a new record (never mutates `srcMeta`)
 */
export const applyMetaField = (
	srcMeta: MetaState | undefined,
	property: MetaProperty,
	value: string | null,
): MetaState | undefined => {
	const mergedMeta = mergeMetaDoc(srcMeta, { [property]: value });
	if (mergedMeta?.[property] === srcMeta?.[property]) {
		return srcMeta;
	}
	return mergedMeta === undefined ? undefined : rebrand<MetaState>(mergedMeta);
};
