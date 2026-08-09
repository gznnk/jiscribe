import { calcTextObjectFrameSize } from "./calcTextObjectFrameSize";
import { TEXT_DOC_DEFAULTS, type TextDoc } from "./TextDoc";
import { DEFAULT_FONT_FAMILY } from "../../../../constants/defaultFontFamily";
import { createPointObjectFactory } from "../../utils/createPointObjectFactory";

/**
 * Factory for text objects. Creation happens outside any theme context, so the
 * box is measured with the built-in default family; the theme-aware paths
 * (canvasToState and the reducer's size reconcile) correct it once the object is
 * in a canvas.
 */
export const TextObjectFactory = createPointObjectFactory<Omit<TextDoc, "id">>(
	TEXT_DOC_DEFAULTS,
	(doc) => calcTextObjectFrameSize(doc.text ?? "", doc, DEFAULT_FONT_FAMILY),
);
