import type { ErEntityState } from "./ErEntityState";
import { resizeErEntityFromDrawnCorner } from "./resizeErEntityFromDrawnCorner";
import { distributeErEntityWidthToSlots } from "../layout/distributeErEntityWidthToSlots";
import { calcErEntityMinWidth } from "../layout/erEntitySlotWidths";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";

/**
 * The entity with a box width written from outside spread over its stated
 * widths: the key gutter kept as stated, the name and the type split by the px
 * they are drawn at (distributeErEntityWidthToSlots) and written as stated, so
 * each is drawn exactly at what it is given.
 */
const writeOutsideWidth = (state: ErEntityState): ErEntityState => {
	const drawnLayout = readCachedErEntityLayout(state);
	const widths = distributeErEntityWidthToSlots(
		drawnLayout,
		state.width,
		drawnLayout.slotFloors,
	);
	return { ...state, nameWidth: widths.nameWidth, typeWidth: widths.typeWidth };
};

/**
 * Keeps an entity's box agreeing with its slots. Registered as the type's
 * `contentResizer`, so it runs on load, on undo, on external sync, on every
 * keystroke of an in-place edit and on every frame of every gesture. Two steps,
 * in this order:
 *
 * 1. **A width written from outside is spread over the name and the type.** The
 *    core width handle (`resize: "width"`) writes a `width` and knows nothing of
 *    slots, so a `width` other than the one this resizer last derived
 *    (`derivedWidth`) is read as that write, as the table reads its own
 *    (reconcileTableBoxWithGrid). The key gutter keeps its width and the rest is
 *    split by the name's and the type's drawn px, neither going under its floor;
 *    the result is written as their stated widths. This is the only step that
 *    writes a stated width.
 * 2. **The box is derived from the layout** (readCachedErEntityLayout): each slot
 *    drawn at its stated width widened to its longest text, the width their sum,
 *    the height following the rows, the drawn top-left corner kept. Measurement
 *    never writes a stated width, so typing a long name widens the box while the
 *    edit lasts and after, and deleting it narrows the box back to the stated
 *    width; a font arriving later re-fits the same way. `minWidth` is re-derived
 *    for the handles to stop at (calcErEntityMinWidth) — exactly the narrowest
 *    width step 1 can honour, so a handle never fights the cursor.
 *
 * Returning `state` itself when nothing moved is part of the contract
 * (ObjectContentResizer): callers skip the rest of the pass by reference; a
 * second run on the result always does, `width` then being `derivedWidth` and
 * the layout the one just derived.
 *
 * @param state - The entity; its `text`, stated slot widths, `width`, `derivedWidth` and current box are read
 * @returns The state with the box reconciled, or the same object when it already was
 */
export const reconcileErEntityBox = (state: ErEntityState): ErEntityState => {
	const isOutsideWidthWrite = state.width !== state.derivedWidth;
	const statedState = isOutsideWidthWrite ? writeOutsideWidth(state) : state;
	const layout = readCachedErEntityLayout(statedState);
	const minWidth = calcErEntityMinWidth(layout.keyWidth, layout.slotFloors);
	if (
		statedState === state &&
		layout.width === state.width &&
		layout.height === state.height &&
		minWidth === state.minWidth
	) {
		return state;
	}
	return {
		...resizeErEntityFromDrawnCorner(statedState, {
			width: layout.width,
			height: layout.height,
		}),
		derivedWidth: layout.width,
		minWidth,
	};
};
