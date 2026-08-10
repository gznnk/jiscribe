import type {
	ObjectTextEditOverflowResolver,
	ObjectTypeDefinition,
} from "@jiscribe/canvas";
import { createFrameBehavior } from "@jiscribe/canvas-sdk";

import { recordDocDefinition } from "./doc";
import { calcRecordTextRegion } from "./presentation/calcRecordTextRegion";
import { RecordBox } from "./presentation/RecordBox";
import { isRecordListSlotId } from "./schema/RecordDoc";
import type { RecordDoc } from "./schema/RecordDoc";
import { recordToDoc, recordToState } from "./state/RecordMapper";
import type { RecordState } from "./state/RecordState";
import { isValidRecordState } from "./state/validateRecordState";
import { RecordStencils } from "./stencil/RecordStencils";

/**
 * A text band (the title, the stereotype above it) is sized from its own text
 * (calcRecordSlotRegions), so it follows the draft while it is typed and the
 * editor may grow with it, down to the box's bottom edge. A row compartment stays
 * `"scroll"`: its region already follows the draft where it can, and letting the
 * editor pass it would spill over the compartment below.
 */
const resolveRecordTextEditOverflow: ObjectTextEditOverflowResolver = (
	slotId,
) => (isRecordListSlotId(slotId) ? "scroll" : "grow");

/**
 * The record's text slots need no declaration here: the keys of `state.text`
 * are the authority, and the per-type contributions are `textRegion` and
 * `textEditOverflow`, which both take the slot id (see calcRecordTextRegion).
 *
 * The `text` menu section keeps fontStyle / textAlignment: with no slot picked
 * a menu edit writes into every slot at once (TextSlotStyleProperty), so the
 * title band and the rows — the bulk of the box — change together; clicking one
 * slot first narrows the same edit to it.
 *
 * `createFrameObjectDefinition` is not used here: it derives the mapper from
 * features, and the record's is the derived one wrapped in the slot normal form
 * (see RecordMapper).
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
