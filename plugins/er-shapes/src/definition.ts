import type {
	ConnectionAnchorSpec,
	ConnectionAnchors,
	ObjectTextEditOverflowResolver,
	ObjectTransformHandles,
	ObjectTypeDefinition,
	PropertyPanelSection,
	SelectionControlDefinition,
} from "@jiscribe/canvas";
import {
	createDefaultPropertyPanel,
	createFrameBehavior,
	createTextSlotPartKindDefinition,
} from "@jiscribe/canvas-sdk";

import { calcConnectionAnchorOffsetPastGrips } from "./controls/ErEntityColumnGrip";
import { ErEntityColumnGripControl } from "./controls/ErEntityColumnGripControl";
import { ErEntitySlotBoundaryControl } from "./controls/ErEntitySlotBoundaryControl";
import { ErEntityTrailingEdgeControl } from "./controls/ErEntityTrailingEdgeControl";
import { handleErEntityColumnGrip } from "./controls/handleErEntityColumnGrip";
import { handleErEntitySlotBoundary } from "./controls/handleErEntitySlotBoundary";
import { handleErEntityTrailingEdge } from "./controls/handleErEntityTrailingEdge";
import { erEntityDocDefinition } from "./doc";
import { ErEntityColumnMenu } from "./menu/ErEntityColumnMenu";
import { ER_ENTITY_INSERT_PICKED_PART_KINDS } from "./menu/readOfferedErEntityInsertCommands";
import { collectErEntityTextSlotRange } from "./parts/collectErEntityTextSlotRange";
import { ER_ENTITY_COLUMN_PART_DEFINITION } from "./parts/erEntityColumnPartKind";
import { calcErEntityConnectPoints } from "./presentation/calcErEntityConnectPoints";
import {
	calcErEntityTextSlotRegion,
	calcErEntityTextSlotRegions,
} from "./presentation/calcErEntityTextSlotRegions";
import { ErEntityBox } from "./presentation/ErEntityBox";
import { erEntityGeometryKey } from "./presentation/erEntityGeometryKey";
import { ErEntityColumnProperty } from "./propertyPanel/ErEntityColumnProperty";
import {
	erEntityColumnConnectPointId,
	countErEntityColumns,
} from "./schema/erEntityColumnIds";
import { ER_ENTITY_NAME_TEXT_SLOT_ID } from "./schema/ErEntityDoc";
import type { ErEntityDoc } from "./schema/ErEntityDoc";
import { clearErEntityTextSlots } from "./state/clearErEntityTextSlots";
import { erEntityToDoc, erEntityToState } from "./state/ErEntityMapper";
import type { ErEntityState } from "./state/ErEntityState";
import { reconcileErEntityBox } from "./state/reconcileErEntityBox";
import { isValidErEntityState } from "./state/validateErEntityState";
import { ErEntityStencils } from "./stencil/ErEntityStencils";

/**
 * The title band is sized from its own text (calcErEntityLayout), so the editor
 * may grow with the draft; a column slot is one row tall and scrolls, or it
 * would spill over the row below.
 */
const resolveErEntityTextEditOverflow: ObjectTextEditOverflowResolver = (
	slotId,
) => (slotId === ER_ENTITY_NAME_TEXT_SLOT_ID ? "grow" : "scroll");

/**
 * The left and right handles alone: the height is derived from the columns, and
 * a width the handles write is spread over the name and the type by their px
 * (reconcileErEntityBox). Declared at module scope because the registry memoizes
 * on the declaration itself.
 */
const ER_ENTITY_TRANSFORM_HANDLES: ObjectTransformHandles = {
	resize: "width",
};

/**
 * The slot boundaries, the trailing edge and the column grips, all drawn under
 * the core handles.
 *
 * The slot boundaries are two strips (key / name and name / type) under the
 * title band, each shown by a dashed guide; a drag resizes the slot left of the boundary and the box with it,
 * or with Shift held trades between the two slots (handleErEntitySlotBoundary),
 * writing the px of the slots that moved.
 *
 * The trailing edge is a strip down the right edge under the title band, with no
 * guide; a drag resizes the type column alone and the box with it
 * (handleErEntityTrailingEdge), the right width handle keeping its middle.
 *
 * The column grips, a pill per row down the left edge, write the pick and nothing else, so a
 * click on one is never a document change; the left width handle keeps the press
 * where the two overlap.
 */
const ER_ENTITY_SELECTION_CONTROLS: SelectionControlDefinition<ErEntityState>[] =
	[
		{
			name: "slotBoundary",
			layer: "belowHandles",
			Component: ErEntitySlotBoundaryControl,
			handle: handleErEntitySlotBoundary,
		},
		{
			name: "trailingEdge",
			layer: "belowHandles",
			Component: ErEntityTrailingEdgeControl,
			handle: handleErEntityTrailingEdge,
		},
		{
			name: "columnGrip",
			layer: "belowHandles",
			events: ["click"],
			Component: ErEntityColumnGripControl,
			handle: handleErEntityColumnGrip,
		},
	];

/** An anchor the entity does not offer (see calcErEntityConnectionAnchors). */
const ER_ENTITY_HIDDEN_ANCHOR: ConnectionAnchorSpec = { hidden: true };

/** What an entity of no columns changes about its anchors: nothing, its left and right midpoints being the only points on those edges. */
const ER_ENTITY_NO_COLUMN_ANCHORS: ConnectionAnchors = {};

/**
 * While the entity has a column, the left and right edge midpoints are not
 * offered: every row already offers a point of its own on both edges
 * (calcErEntityConnectPoints), and the midpoint would sit on one of them, a
 * second dot meaning "this row" or "the entity" depending on which one the drop
 * lands nearer. A connector a doc attaches there still draws. Each column's left
 * point is pushed out past its row's grip, which it would otherwise sit on. An
 * entity of no columns offers its midpoints as any box does.
 */
const calcErEntityConnectionAnchors = (
	state: ErEntityState,
	zoom: number,
): ConnectionAnchors => {
	const columnCount = countErEntityColumns(state.text);
	if (columnCount === 0) {
		return ER_ENTITY_NO_COLUMN_ANCHORS;
	}
	const pastGrips = { offset: calcConnectionAnchorOffsetPastGrips(zoom) };
	const anchors: Record<string, ConnectionAnchorSpec> = {
		leftCenter: ER_ENTITY_HIDDEN_ANCHOR,
		rightCenter: ER_ENTITY_HIDDEN_ANCHOR,
	};
	for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
		anchors[erEntityColumnConnectPointId(columnIndex, "left")] = pastGrips;
	}
	return anchors;
};

/** Id of the column section of the sidebar and the menu, and of the custom item each holds. */
const ER_ENTITY_COLUMN_SECTION_ID = "erEntity-column";

/** The sections the features derive, and a column section after them. */
const ER_ENTITY_PROPERTY_PANEL: PropertyPanelSection[] = [
	...createDefaultPropertyPanel(erEntityDocDefinition.features),
	{
		id: ER_ENTITY_COLUMN_SECTION_ID,
		label: { en: "Column", ja: "カラム" },
		items: [
			{
				type: "custom",
				id: ER_ENTITY_COLUMN_SECTION_ID,
				component: ErEntityColumnProperty,
				pickedPartKinds: ER_ENTITY_INSERT_PICKED_PART_KINDS,
			},
		],
	},
];

/**
 * `createFrameObjectDefinition` is not used here for the reason its doc half is
 * not (see ./doc): it is built around a stored box. The mapper and the content
 * resizer replace it.
 *
 * Every text is a text slot placed by the `"textSlot"` part kind's `regions`
 * (calcErEntityTextSlotRegions), which is what gives each key, name and type its
 * own click, double click and Tab stop; a Shift range of slots is the rectangle
 * its two ends span, the title a full-width row above the columns
 * (collectErEntityTextSlotRange), and the arrows step or widen a slot pick
 * (ER_ENTITY_TEXT_SLOT_SELECTION_COMMANDS). A whole column is a part of its own kind
 * (ER_ENTITY_COLUMN_PART_DEFINITION), picked by its grip — several with Shift
 * or Ctrl / Meta, or Shift+Up / Down — and removed by Delete, where Delete over
 * picked slots only empties them (clearErEntityTextSlots).
 * The column connect points (calcErEntityConnectPoints) are re-resolved by
 * `geometryKey` when a row is added, removed or changes its pitch.
 *
 * A text style lands where the pick says: on the picked slots, on the picked
 * columns' three slots each, or on every slot when the entity itself is selected.
 * What a slot leaves unset resolves through its role
 * (readErEntityTextSlotStyleDefaults). The column section offers the insertions
 * (readOfferedErEntityInsertCommands); there is no delete button.
 */
export const erEntityDefinition: ObjectTypeDefinition<
	ErEntityDoc,
	ErEntityState
> = {
	...erEntityDocDefinition,
	mapper: { toDoc: erEntityToDoc, toState: erEntityToState },
	stateValidator: isValidErEntityState,
	contentResizer: (state) => reconcileErEntityBox(state as ErEntityState),
	component: ErEntityBox,
	textEditOverflow: resolveErEntityTextEditOverflow,
	extraConnectPoints: (state) =>
		calcErEntityConnectPoints(state as ErEntityState),
	geometryKey: (state) => erEntityGeometryKey(state as ErEntityState),
	behavior: createFrameBehavior<ErEntityState>(),
	selectionControls: ER_ENTITY_SELECTION_CONTROLS,
	partKinds: [
		ER_ENTITY_COLUMN_PART_DEFINITION,
		{
			...createTextSlotPartKindDefinition<ErEntityState>({
				regions: calcErEntityTextSlotRegions,
			}),
			// Declared beside `regions` (placeTextSlotRegions takes both), so a slot
			// asked for alone is placed without placing every other.
			region: calcErEntityTextSlotRegion,
			range: collectErEntityTextSlotRange,
			delete: clearErEntityTextSlots,
		},
	],
	transformHandles: ER_ENTITY_TRANSFORM_HANDLES,
	connectionAnchors: calcErEntityConnectionAnchors,
	stencils: ErEntityStencils,
	propertyPanel: ER_ENTITY_PROPERTY_PANEL,
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
			items: [
				{ type: "font" },
				{ type: "textFormat" },
				{ type: "textAlignment" },
			],
		},
		{
			id: "column",
			items: [
				{
					type: "custom",
					id: ER_ENTITY_COLUMN_SECTION_ID,
					component: ErEntityColumnMenu,
					pickedPartKinds: ER_ENTITY_INSERT_PICKED_PART_KINDS,
				},
			],
		},
	],
};
