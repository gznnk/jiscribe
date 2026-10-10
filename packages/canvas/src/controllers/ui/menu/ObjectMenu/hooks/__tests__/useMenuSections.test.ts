import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import type { ObjectPartSelection } from "../../../../../selection/CanvasSelection";
import { TEXT_SLOT_PART_KIND } from "../../../../../selection/partKinds/textSlotPartKind";
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

const makeState = (part: ObjectPartSelection | null): CanvasControllerState =>
	({
		objects: { "rec-1": slotShape("rec-1") },
		selection: selectionOf(["rec-1"], part),
	}) as unknown as CanvasControllerState;

const registry = createObjectMenuRegistry();
registry.register("record", RECORD_SECTIONS);

describe("getMenuSections", () => {
	it("returns every registered section while no slot is selected", () => {
		expect(getMenuSections(makeState(null), registry)).toEqual(RECORD_SECTIONS);
	});

	it("keeps only the text items once a slot is selected", () => {
		const state = makeState({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "name", focusId: "name" }],
		});
		expect(getMenuSections(state, registry)).toEqual([
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
});
