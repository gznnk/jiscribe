import { TEXT_DOC_DEFAULTS, type TextDoc } from "./TextDoc";
import { createPointObjectFactory } from "../../utils/createPointObjectFactory";

/**
 * Factory for text objects. The created doc carries the placement position and
 * no box: the size is measured where the drawn font is known (canvasToState and
 * the reducer's size reconcile), so creation stays free of the DOM.
 */
export const TextObjectFactory =
	createPointObjectFactory<Omit<TextDoc, "id">>(TEXT_DOC_DEFAULTS);
