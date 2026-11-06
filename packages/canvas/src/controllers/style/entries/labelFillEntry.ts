import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";

import type { LabelTextStyleState } from "../../../states/objects/base/LabelTextStyleState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { StyleEntry } from "../StyleEntry";

/** A state seen with the one field this entry reads and writes, which only a `text: "label"` type carries. */
type LabelFilledObjectState = ObjectState & LabelTextStyleState;

/**
 * The background painted behind a `text: "label"` caption (`labelFill`), stored
 * on the object the way a shape's `fill` is. An object stating none reads as
 * `"auto"`, the knockout an absent field is drawn with (resolveLabelFill), so a
 * caption left as created and one set back to auto read alike.
 */
export const labelFillEntry: StyleEntry<ObjectState, string> = {
	apply: (object, _pick, color) =>
		(object as LabelFilledObjectState).labelFill === color
			? object
			: ({ ...object, labelFill: color } as ObjectState),
	read: (object) => [
		(object as LabelFilledObjectState).labelFill ?? AUTO_COLOR,
	],
};
