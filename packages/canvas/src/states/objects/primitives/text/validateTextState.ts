import { TextFeatures } from "@jiscribe/doc/model/objects/primitives/text/TextDoc";
import { isTextLayout } from "@jiscribe/doc/model/objects/types/TextLayout";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/**
 * Validates TextState. The state of a point-geometry shape is a Frame like any
 * other, so the Frame-family validator applies unchanged — the size being
 * derived rather than stored is a doc-side distinction. `textLayout` is the one
 * field of the type's own: this is the clipboard boundary, and the mapper writes
 * the field back to the document unchecked, so a value outside the enum would
 * make a paste save a file the doc validator refuses on the next open.
 */
export const isValidTextState: ObjectStateValidator = createFrameStateValidator(
	TextFeatures,
	(o) => o.textLayout === undefined || isTextLayout(o.textLayout),
);
