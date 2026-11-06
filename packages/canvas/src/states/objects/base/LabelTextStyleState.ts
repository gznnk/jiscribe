import type {
	LABEL_TEXT_KEYS,
	LabelTextStyleDoc,
} from "@jiscribe/doc/model/objects/base/TextStyleDoc";

/**
 * A `features.text: "label"` caption's own fields in runtime state: the doc's,
 * under the same names and in the same form, so the mapper passes them through
 * (collectStyleKeys) rather than converting them.
 */
export type LabelTextStyleState = Pick<
	LabelTextStyleDoc,
	(typeof LABEL_TEXT_KEYS)[number]
>;
