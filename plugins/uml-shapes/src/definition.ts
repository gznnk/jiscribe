import type {
	ObjectTextEditOverflowResolver,
	ObjectTypeDefinition,
} from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

import { recordDocDefinition } from "./doc";
import { calcRecordTextRegion } from "./presentation/calcRecordTextRegion";
import { RecordBox } from "./presentation/RecordBox";
import { RECORD_NAME_SLOT_ID } from "./schema/RecordDoc";
import type { RecordDoc } from "./schema/RecordDoc";
import { recordToDoc, recordToState } from "./state/RecordMapper";
import type { RecordState } from "./state/RecordState";
import { isValidRecordState } from "./state/validateRecordState";
import { RecordStencils } from "./stencil/RecordStencils";

/**
 * The title band is sized from the title itself (calcRecordSlotRegions), so it
 * follows the draft while it is typed and the editor may grow with it. The rows
 * region is only the leftover below that band — it does not answer to the rows
 * text — so its editor stays inside it and scrolls.
 */
const resolveRecordTextEditOverflow: ObjectTextEditOverflowResolver = (
	slotId,
) => (slotId === RECORD_NAME_SLOT_ID ? "grow" : "scroll");

/**
 * The record's two text slots need no declaration here: the keys of `state.text`
 * are the authority, and the per-type contributions are `textRegion` and
 * `textEditOverflow`, which both take the slot id (see calcRecordTextRegion).
 *
 * The `text` menu section keeps fontStyle / textAlignment: a menu edit writes
 * into every slot at once (TextSlotStyleProperty), so the title band and the
 * rows — the bulk of the box — change together.
 */
export const recordDefinition: ObjectTypeDefinition<RecordDoc, RecordState> = {
	...recordDocDefinition,
	mapper: { toDoc: recordToDoc, toState: recordToState },
	stateValidator: isValidRecordState,
	component: RecordBox,
	textRegion: calcRecordTextRegion,
	textEditOverflow: resolveRecordTextEditOverflow,
	behavior: createFrameBehavior<RecordState>(),
	stencils: RecordStencils,
	menu: [
		{
			id: "style",
			items: [
				{ type: "backgroundColor" },
				{ type: "borderColor" },
				{ type: "borderStyle", radius: false },
			],
		},
		{
			id: "text",
			items: [{ type: "fontStyle" }, { type: "textAlignment" }],
		},
		{
			id: "transform",
			items: [{ type: "aspectRatio" }],
		},
	],
};
