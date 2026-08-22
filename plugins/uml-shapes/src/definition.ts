import type {
	ObjectTextEditOverflowResolver,
	ObjectTypeDefinition,
} from "@jiscribe/canvas";
import {
	createFrameBehavior,
	createFrameObjectDefinition,
	createTypeStencils,
} from "@jiscribe/canvas-sdk";

import {
	recordDocDefinition,
	umlComponentDocDefinition,
	umlPackageDocDefinition,
} from "./doc";
import { calcRecordTextRegion } from "./presentation/calcRecordTextRegion";
import { RecordBox } from "./presentation/RecordBox";
import { UmlComponentBox } from "./presentation/UmlComponentBox";
import { UmlPackageBox } from "./presentation/UmlPackageBox";
import { umlPackageOutline } from "./presentation/umlPackageOutline";
import { isRecordListSlotId } from "./schema/RecordDoc";
import type { RecordDoc } from "./schema/RecordDoc";
import { calcUmlPackageTextRegion } from "./schema/textRegions";
import type { UmlComponentDoc } from "./schema/UmlComponentDoc";
import type { UmlPackageDoc } from "./schema/UmlPackageDoc";
import { recordToDoc, recordToState } from "./state/RecordMapper";
import type { RecordState } from "./state/RecordState";
import type { UmlComponentState } from "./state/UmlComponentState";
import type { UmlPackageState } from "./state/UmlPackageState";
import { isValidRecordState } from "./state/validateRecordState";
import { RecordStencils } from "./stencil/RecordStencils";
import { UmlComponentIcon } from "./stencil/UmlComponentIcon";
import { UmlPackageIcon } from "./stencil/UmlPackageIcon";

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

/**
 * `outline` is what puts a connector's center anchor on the notch beside the tab
 * instead of on the bounding box, and `textRegion` keeps the name in the body, so
 * a first line cannot run into the tab. `menu` stays undeclared, so it is derived
 * from the features, unlike the record's.
 */
export const umlPackageDefinition: ObjectTypeDefinition<
	UmlPackageDoc,
	UmlPackageState
> = createFrameObjectDefinition<UmlPackageDoc, UmlPackageState>({
	doc: umlPackageDocDefinition,
	component: UmlPackageBox,
	textRegion: calcUmlPackageTextRegion,
	outline: umlPackageOutline,
	stencils: createTypeStencils({
		objectType: "umlPackage",
		label: { en: "Package", ja: "パッケージ" },
		icon: UmlPackageIcon,
	}),
});

/**
 * No `outline` and no `textRegion`: the silhouette is the bounding box itself
 * (the icon is drawn inside it), which is exactly what both default to, and the
 * name is centered over the whole box.
 */
export const umlComponentDefinition: ObjectTypeDefinition<
	UmlComponentDoc,
	UmlComponentState
> = createFrameObjectDefinition<UmlComponentDoc, UmlComponentState>({
	doc: umlComponentDocDefinition,
	component: UmlComponentBox,
	stencils: createTypeStencils({
		objectType: "umlComponent",
		label: { en: "Component", ja: "コンポーネント" },
		icon: UmlComponentIcon,
	}),
});
