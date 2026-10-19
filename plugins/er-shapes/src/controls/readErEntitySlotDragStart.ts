import type { ErEntitySlotDragStart } from "./calcErEntitySlotBoundaryDrag";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * What a slot width drag starts from: the three slot widths as the entity is
 * drawn — each its stated width fitted to its texts, an unstated key gutter
 * sized to the widest key — with the floors its texts set. A drag starts from
 * what is drawn rather than what is stated, and writes stated widths
 * (writeErEntitySlotWidths).
 *
 * @param entity - The entity as of gesture start
 * @returns Fresh drawn widths and the layout's floors
 */
export const readErEntitySlotDragStart = (
	entity: ErEntityState,
): ErEntitySlotDragStart => {
	const layout = readCachedErEntityLayout(entity);
	return {
		keyWidth: layout.keyWidth,
		nameWidth: layout.nameWidth,
		typeWidth: layout.typeWidth,
		floors: layout.slotFloors,
	};
};
