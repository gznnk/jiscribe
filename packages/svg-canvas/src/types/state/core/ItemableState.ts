import type { ItemableType } from "../../core/ItemableType";
import type { ItemableData } from "../../data/core/ItemableData";

/**
 * State type for elements that can contain child elements.
 * Since ItemableData has no non-persistent keys, this directly extends the data type.
 */
export type ItemableState = ItemableData & {
	itemableType: ItemableType;
};
