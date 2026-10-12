import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import type { ObjectPartSelection } from "../../../../../selection/CanvasSelection";
import { TEXT_SLOT_PART_KIND } from "../../../../../selection/partKinds/textSlotPartKind";
import { objectFieldEntry } from "../../../../../style/entries/objectFieldEntry";
import { createObjectStyleRegistry } from "../../../../../style/tables/ObjectStyleRegistry";
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
		objects: { "rec-1": { ...slotShape("rec-1"), type } },
		selection: selectionOf(["rec-1"], part),
	}) as unknown as CanvasControllerState;

const NAME_SLOT_PICK: ObjectPartSelection = {
	kind: TEXT_SLOT_PART_KIND,
	ranges: [{ anchorId: "name", focusId: "name" }],
};

const registry = createObjectMenuRegistry();
registry.register("record", RECORD_SECTIONS);
// The same menu, from a type that says where a fill lands under a pick.
registry.register("filled-record", RECORD_SECTIONS);

const styleRegistry = createObjectStyleRegistry();
styleRegistry.register("record", {}, {});
styleRegistry.register(
	"filled-record",
	{},
	{ fill: objectFieldEntry<ObjectState, "fill">("fill") },
);

describe("getMenuSections", () => {
	it("returns every registered section while no slot is selected", () => {
		expect(getMenuSections(makeState(null), registry, styleRegistry)).toEqual(
			RECORD_SECTIONS,
		);
	});

	it("keeps only the text items once a slot is selected", () => {
		const state = makeState(NAME_SLOT_PICK);
		expect(getMenuSections(state, registry, styleRegistry)).toEqual([
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

	it("keeps an item whose kind the picked object's type declares", () => {
		const state = makeState(NAME_SLOT_PICK, "filled-record");
		expect(getMenuSections(state, registry, styleRegistry)).toEqual([
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
			...makeState(NAME_SLOT_PICK, "filled-record"),
			textEditState: { kind: "shape" },
		} as unknown as CanvasControllerState;
		expect(
			getMenuSections(state, registry, styleRegistry).map(
				(section) => section.id,
			),
		).toEqual(["style", "text"]);
	});
});
