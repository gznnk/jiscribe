import type { CreateObjectState } from "@jiscribe/canvas";
import type { RichText, TextSlot } from "@jiscribe/doc";

import type { ErEntityFeatures } from "../schema/ErEntityDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ErEntityStateBrand: unique symbol;

/**
 * An entity at runtime. `keyWidth`, `nameWidth` and `typeWidth` are the doc's
 * stated widths, written only by people and the AI (a boundary or edge drag, a
 * width handle, `extraProps`) and never by measurement; the slots are drawn at
 * those widths widened to their texts (fitErEntityStatedSlotWidths). `width` is
 * the drawn widths summed and `height` / `cx` / `cy` are derived from them and the
 * content, and the content resizer rewrites them whenever the slots change
 * (reconcileErEntityBox). A `width` other than `derivedWidth` is a width written
 * from outside (the core width handle), which the resizer spreads over the name
 * and the type.
 *
 * `text` holds every text of the entity: the title under `name`, and three slots
 * per column (erEntityColumnTextSlotId), exactly `erEntityTextSlotIds(n)` in that
 * order — the columns are nothing but their slots. Each slot holds only the
 * typography it states itself; what it leaves unset resolves per read through
 * the slot's role (readErEntityTextSlotStyleDefaults).
 */
export type ErEntityState = CreateObjectState<
	typeof ErEntityFeatures,
	typeof ErEntityStateBrand,
	{
		/** Stated key gutter width in px, the doc's; absent = sized to the widest key. */
		keyWidth?: number;
		/** Stated name column width in px, the doc's or its default; always present, and may be narrower than the column is drawn. */
		nameWidth: number;
		/** Stated type column width in px, the doc's or its default; always present, and may be narrower than the column is drawn. */
		typeWidth: number;
		/**
		 * Runtime only, never written to the doc: the box width the content
		 * resizer last derived from the slots (the drawn widths summed). Kept
		 * because the drawn widths follow the texts — an unstated key gutter, or a
		 * slot whose longest text outgrows its stated width — so without it a
		 * text that moved the box would read as a width written from outside.
		 */
		derivedWidth: number;
		text: Record<string, TextSlot<RichText>>;
	}
>;
