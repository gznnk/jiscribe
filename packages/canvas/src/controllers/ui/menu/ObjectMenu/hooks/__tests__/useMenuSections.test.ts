import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { createTextSlotPartRegistry } from "../../../../../selection/__tests__/support/textSlotPartRegistry";
import type { ObjectPartSelection } from "../../../../../selection/ObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../../../selection/textSlotPartKind";
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
	objectPartSelection: ObjectPartSelection | null,
): CanvasControllerState =>
	({
		objects: { "rec-1": slotShape("rec-1") },
		selectedIds: ["rec-1"],
		selectedConnectorId: null,
		objectPartSelection,
	}) as unknown as CanvasControllerState;

const registry = createObjectMenuRegistry();
registry.register("record", RECORD_SECTIONS);
const objectPart = createTextSlotPartRegistry("record");

describe("getMenuSections", () => {
	it("returns every registered section while no slot is selected", () => {
		expect(getMenuSections(makeState(null), registry, objectPart)).toEqual(
			RECORD_SECTIONS,
		);
	});

	it("keeps only the text items once a slot is selected", () => {
		const state = makeState({
			objectId: "rec-1",
			kind: TEXT_SLOT_PART_KIND,
			partIds: ["name"],
		});
		expect(getMenuSections(state, registry, objectPart)).toEqual([
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

	it("ignores a slot selection that no longer describes the current selection", () => {
		const state = makeState({
			objectId: "rec-1",
			kind: TEXT_SLOT_PART_KIND,
			partIds: ["operations"],
		});
		expect(getMenuSections(state, registry, objectPart)).toEqual(
			RECORD_SECTIONS,
		);
	});
});
