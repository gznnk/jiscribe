import type { ErEntityState } from "./ErEntityState";
import { resizeErEntityFromDrawnCorner } from "./resizeErEntityFromDrawnCorner";
import type { ErEntitySlotWidths } from "../layout/erEntitySlotWidths";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";

/**
 * The gesture-start entity with the slot widths a drag landed on written as its
 * stated widths, the box re-derived from them. The name and the type are always
 * written; the key gutter is stated only when the drag moved it from where it is
 * drawn (or it already was), so a drag on the name / type boundary or the right
 * edge leaves an unstated gutter following the widest key. The box is written
 * here rather than left to the content resizer, `derivedWidth` with it, so the
 * new width is not read as the core width handle's (reconcileErEntityBox). When
 * it changes, the center moves to keep the corner the entity is drawn from
 * (resizeErEntityFromDrawnCorner).
 *
 * @param startEntity - The entity as of gesture start; its drawn key gutter decides whether an unstated one becomes stated
 * @param slotWidths - The widths the drag landed on, each at least its floor (calcErEntitySlotBoundaryDrag / calcErEntityTrailingEdgeDrag), so they are drawn as given
 * @returns A new state; `startEntity` is left untouched
 */
export const writeErEntitySlotWidths = (
	startEntity: ErEntityState,
	slotWidths: ErEntitySlotWidths,
): ErEntityState => {
	const { keyWidth, nameWidth, typeWidth } = slotWidths;
	const isKeyWidthStated =
		startEntity.keyWidth !== undefined ||
		keyWidth !== readCachedErEntityLayout(startEntity).keyWidth;
	const statedEntity: ErEntityState = {
		...startEntity,
		...(isKeyWidthStated && { keyWidth }),
		nameWidth,
		typeWidth,
	};
	const layout = readCachedErEntityLayout(statedEntity);
	if (layout.width === startEntity.width) {
		// The height follows the width alone among what a drag changes.
		return { ...statedEntity, derivedWidth: layout.width };
	}
	return {
		...resizeErEntityFromDrawnCorner(statedEntity, {
			width: layout.width,
			height: layout.height,
		}),
		derivedWidth: layout.width,
	};
};
