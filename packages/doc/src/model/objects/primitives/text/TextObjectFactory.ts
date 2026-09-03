import { TEXT_DOC_DEFAULTS, type TextDoc } from "./TextDoc";
import type { ObjectFactory } from "../../types/ObjectFactory";
import { createPointObjectFactory } from "../../utils/createPointObjectFactory";

const pointFactory =
	createPointObjectFactory<Omit<TextDoc, "id">>(TEXT_DOC_DEFAULTS);

/**
 * Factory for text objects. The created doc carries the placement position and
 * no box: the size is measured where the drawn font is known (canvasToState and
 * the reducer's size reconcile), so creation stays free of the DOM.
 *
 * The one exception is the block layout, whose width the doc does store: the
 * point factory drops every `width` override, the field having nowhere to go in
 * that geometry, so the block layout's own width is put back afterwards.
 */
export const TextObjectFactory: ObjectFactory = {
	...pointFactory,

	createDoc(position, overrides) {
		const created = pointFactory.createDoc(position, overrides);
		if (overrides?.textLayout !== "block" || overrides.width === undefined) {
			return created;
		}
		return { ...created, width: overrides.width };
	},
};
