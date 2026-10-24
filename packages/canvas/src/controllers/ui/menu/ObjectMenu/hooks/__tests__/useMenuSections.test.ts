import { describe, expect, it } from "vitest";

import { createObjectPartKindRegistry } from "../../../../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import type { ObjectPartSelection } from "../../../../../selection/CanvasSelection";
import {
	createTextSlotPartKindDefinition,
	TEXT_SLOT_PART_KIND,
} from "../../../../../selection/partKinds/textSlotPartKind";
import { TEXT_STYLE_INTENT_KINDS } from "../../../../../style/StyleIntent";
import { createObjectMenuRegistry } from "../../ObjectMenuRegistry";
import type { ObjectMenuSection } from "../../ObjectMenuTypes";
import { getMenuSections } from "../useMenuSections";

const CustomItemComponent = (): null => null;

/** A record-like shape: multiple text slots, declared via features.text = "slots". */
const slotShape = (id: string): ObjectState =>
	({
		id,
		type: "record",
		features: { text: "slots" },
		text: { name: { text: "User" }, rows: { text: ["id: string"] } },
	}) as unknown as ObjectState;

const RECORD_SECTIONS: ObjectMenuSection[] = [
	{
		id: "style",
		items: [
			{ type: "backgroundColor" },
			{ type: "borderColor" },
			{ type: "borderStyle", radius: true },
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
		id: "record-extras",
		items: [
			{ type: "custom", id: "record-header", component: CustomItemComponent },
		],
	},
];

const makeState = (
	part: ObjectPartSelection | null,
	type = "record",
): CanvasControllerState =>
	({
		mode: { kind: "normal" },
		objects: { "rec-1": { ...slotShape("rec-1"), type } },
		selection: selectionOf(["rec-1"], part),
	}) as unknown as CanvasControllerState;

const NAME_TEXT_SLOT_PICK: ObjectPartSelection = {
	kind: TEXT_SLOT_PART_KIND,
	ranges: [{ anchorId: "name", focusId: "name" }],
};

const registry = createObjectMenuRegistry();
registry.register("record", RECORD_SECTIONS);
// The same menu, from a type that says where a fill lands under a pick.
registry.register("filled-record", RECORD_SECTIONS);

const coreTextSlot = createTextSlotPartKindDefinition();
const partKindRegistry = createObjectPartKindRegistry();
// A vertex-like kind beside the slots, declaring no style kinds.
partKindRegistry.register("record", [
	coreTextSlot,
	{ kind: "vertex", has: () => true },
]);
partKindRegistry.register("filled-record", [
	{
		...coreTextSlot,
		styleIntentKinds: new Set([...TEXT_STYLE_INTENT_KINDS, "fill"]),
	},
]);

const VERTEX_PICK: ObjectPartSelection = {
	kind: "vertex",
	ranges: [{ anchorId: "0", focusId: "0" }],
};

describe("getMenuSections", () => {
	it("returns every registered section while no slot is selected", () => {
		expect(
			getMenuSections(makeState(null), registry, partKindRegistry),
		).toEqual(RECORD_SECTIONS);
	});

	it("keeps only the text items once a slot is selected", () => {
		const state = makeState(NAME_TEXT_SLOT_PICK);
		expect(getMenuSections(state, registry, partKindRegistry)).toEqual([
			{
				id: "text",
				items: [
					{ type: "font" },
					{ type: "textFormat" },
					{ type: "textAlignment" },
				],
			},
		]);
	});

	it("keeps an item whose every kind the picked kind receives", () => {
		const state = makeState(NAME_TEXT_SLOT_PICK, "filled-record");
		expect(getMenuSections(state, registry, partKindRegistry)).toEqual([
			{ id: "style", items: [{ type: "backgroundColor" }] },
			{
				id: "text",
				items: [
					{ type: "font" },
					{ type: "textFormat" },
					{ type: "textAlignment" },
				],
			},
		]);
	});

	it("keeps it while the picked slot is being edited", () => {
		const state = {
			...makeState(NAME_TEXT_SLOT_PICK, "filled-record"),
			mode: { kind: "textEdit", draft: { kind: "shape" } },
		} as unknown as CanvasControllerState;
		expect(
			getMenuSections(state, registry, partKindRegistry).map(
				(section) => section.id,
			),
		).toEqual(["style", "text"]);
	});

	it("leaves every section under a pick of a kind declaring no style kinds", () => {
		expect(
			getMenuSections(makeState(VERTEX_PICK), registry, partKindRegistry),
		).toEqual(RECORD_SECTIONS);
	});

	it("keeps a custom item naming the picked kind, and drops it under a kind it does not name", () => {
		const gridRegistry = createObjectMenuRegistry();
		gridRegistry.register("grid", [
			{ id: "text", items: [{ type: "font" }] },
			{
				id: "insert",
				items: [
					{
						type: "custom",
						id: "insert-rows",
						component: CustomItemComponent,
						pickedPartKinds: ["row"],
					},
				],
			},
		]);
		const gridPartKindRegistry = createObjectPartKindRegistry();
		gridPartKindRegistry.register("grid", [
			coreTextSlot,
			{
				kind: "row",
				has: () => true,
				styleIntentKinds: TEXT_STYLE_INTENT_KINDS,
			},
		]);
		const sectionIdsUnder = (pick: ObjectPartSelection): string[] =>
			getMenuSections(
				makeState(pick, "grid"),
				gridRegistry,
				gridPartKindRegistry,
			).map((section) => section.id);

		expect(
			sectionIdsUnder({
				kind: "row",
				ranges: [{ anchorId: "0", focusId: "0" }],
			}),
		).toEqual(["text", "insert"]);
		expect(sectionIdsUnder(NAME_TEXT_SLOT_PICK)).toEqual(["text"]);
	});
});
