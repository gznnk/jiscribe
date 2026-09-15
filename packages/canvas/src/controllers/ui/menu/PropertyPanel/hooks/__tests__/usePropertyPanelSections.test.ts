import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { createPropertyPanelRegistry } from "../../PropertyPanelRegistry";
import type { PropertyPanelSection } from "../../PropertyPanelTypes";
import { getPropertyPanelSections } from "../usePropertyPanelSections";

const RECT_SECTIONS: PropertyPanelSection[] = [
	{
		id: "layout",
		label: "Layout",
		items: [{ type: "position" }, { type: "size" }, { type: "autoHeight" }],
	},
	{ id: "fill", label: "Fill", items: [{ type: "fill" }] },
	{
		id: "text",
		label: "Text",
		items: [{ type: "fontSize" }, { type: "textAlign" }],
	},
];

const ELLIPSE_SECTIONS: PropertyPanelSection[] = [
	{
		id: "layout",
		label: "Layout",
		items: [{ type: "position" }, { type: "size" }],
	},
	{ id: "fill", label: "Fill", items: [{ type: "fill" }] },
	{ id: "text", label: "Text", items: [{ type: "fontSize" }] },
];

const LINE_SECTIONS: PropertyPanelSection[] = [
	{ id: "line", label: "Line", items: [{ type: "strokeColor" }] },
];

/** Stands in for a plugin's row component; only its identity is compared. */
const HeaderRow = (): null => null;
/** A second one, so two types can offer a custom row under different ids. */
const BadgeRow = (): null => null;

/** A plugin type whose fill and text sections each carry a row of its own. */
const CONTAINER_SECTIONS: PropertyPanelSection[] = [
	{
		id: "fill",
		label: "Fill",
		items: [
			{ type: "fill" },
			{ type: "custom", id: "header-fill", component: HeaderRow },
		],
	},
	{
		id: "text",
		label: "Text",
		items: [
			{ type: "fontSize" },
			{ type: "custom", id: "header-font", component: HeaderRow },
		],
	},
];

/**
 * A plugin type whose second section is offered only for a selection of one, so
 * the `isShown` predicate has something to turn on.
 */
const GAUGE_SECTIONS: PropertyPanelSection[] = [
	{ id: "fill", label: "Fill", items: [{ type: "fill" }] },
	{
		id: "gauge",
		label: "Gauge",
		isShown: (selection) => selection.selectedIds.length === 1,
		items: [{ type: "custom", id: "gauge-range", component: BadgeRow }],
	},
];

/** Another plugin type, offering the fill row under its own id. */
const BADGE_SECTIONS: PropertyPanelSection[] = [
	{
		id: "fill",
		label: "Fill",
		items: [
			{ type: "fill" },
			{ type: "custom", id: "badge-fill", component: BadgeRow },
		],
	},
];

const registry = createPropertyPanelRegistry();
registry.register("rect", RECT_SECTIONS);
registry.register("ellipse", ELLIPSE_SECTIONS);
registry.register("connector", LINE_SECTIONS);
registry.register("container", CONTAINER_SECTIONS);
registry.register("badge", BADGE_SECTIONS);
registry.register("gauge", GAUGE_SECTIONS);

/** A shape holding one named text slot, so a slot selection can resolve against it. */
const shape = (id: string, type: string): ObjectState =>
	({
		id,
		type,
		features: { text: "slots" },
		text: { body: { text: "hi" } },
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): ObjectState =>
	({ id, type: "group", childIds }) as unknown as ObjectState;

const stateOf = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		objects: {},
		selectedIds: [],
		selectedConnectorId: null,
		selectedTextSlot: null,
		...overrides,
	}) as unknown as CanvasControllerState;

describe("getPropertyPanelSections", () => {
	it("offers nothing while nothing is selected", () => {
		expect(getPropertyPanelSections(stateOf({}), registry)).toEqual([]);
	});

	it("returns the selected type's sections untouched", () => {
		const state = stateOf({
			objects: { "r-1": shape("r-1", "rect") },
			selectedIds: ["r-1"],
		});

		expect(getPropertyPanelSections(state, registry)).toEqual(RECT_SECTIONS);
	});

	it("returns the connector's sections when one is selected", () => {
		const state = stateOf({
			objects: { "c-1": shape("c-1", "connector") },
			selectedConnectorId: "c-1",
		});

		expect(getPropertyPanelSections(state, registry)).toEqual(LINE_SECTIONS);
	});

	it("keeps only the rows every selected type offers", () => {
		const state = stateOf({
			objects: {
				"r-1": shape("r-1", "rect"),
				"e-1": shape("e-1", "ellipse"),
			},
			selectedIds: ["r-1", "e-1"],
		});

		expect(getPropertyPanelSections(state, registry)).toEqual([
			{
				id: "layout",
				label: "Layout",
				items: [{ type: "position" }, { type: "size" }],
			},
			{ id: "fill", label: "Fill", items: [{ type: "fill" }] },
			{ id: "text", label: "Text", items: [{ type: "fontSize" }] },
		]);
	});

	it("drops a section a selected type does not offer at all", () => {
		const state = stateOf({
			objects: {
				"r-1": shape("r-1", "rect"),
				"c-1": shape("c-1", "connector"),
			},
			selectedIds: ["r-1", "c-1"],
		});

		expect(getPropertyPanelSections(state, registry)).toEqual([]);
	});

	it("expands a selected group into the types it holds", () => {
		const state = stateOf({
			objects: {
				"g-1": group("g-1", ["r-1", "e-1"]),
				"r-1": shape("r-1", "rect"),
				"e-1": shape("e-1", "ellipse"),
			},
			selectedIds: ["g-1"],
		});

		expect(
			getPropertyPanelSections(state, registry).map((section) => section.id),
		).toEqual(["layout", "fill", "text"]);
	});

	it("keeps only the text section once a slot is selected", () => {
		const state = stateOf({
			objects: { "r-1": shape("r-1", "rect") },
			selectedIds: ["r-1"],
			selectedTextSlot: { objectId: "r-1", slotId: "body" },
		});

		expect(getPropertyPanelSections(state, registry)).toEqual([
			{
				id: "text",
				label: "Text",
				items: [{ type: "fontSize" }, { type: "textAlign" }],
			},
		]);
	});

	it("keeps a plugin's custom row beside the built-in ones", () => {
		const state = stateOf({
			objects: { "k-1": shape("k-1", "container") },
			selectedIds: ["k-1"],
		});

		expect(getPropertyPanelSections(state, registry)).toEqual(
			CONTAINER_SECTIONS,
		);
	});

	it("keeps a custom row two selected types declare under the same id", () => {
		const state = stateOf({
			objects: {
				"k-1": shape("k-1", "container"),
				"k-2": shape("k-2", "container"),
			},
			selectedIds: ["k-1", "k-2"],
		});

		expect(getPropertyPanelSections(state, registry)).toEqual(
			CONTAINER_SECTIONS,
		);
	});

	it("drops custom rows the selected types spell differently", () => {
		const state = stateOf({
			objects: {
				"k-1": shape("k-1", "container"),
				"b-1": shape("b-1", "badge"),
			},
			selectedIds: ["k-1", "b-1"],
		});

		expect(getPropertyPanelSections(state, registry)).toEqual([
			{ id: "fill", label: "Fill", items: [{ type: "fill" }] },
		]);
	});

	it("drops the custom rows of the text section once a slot is selected", () => {
		const state = stateOf({
			objects: { "k-1": shape("k-1", "container") },
			selectedIds: ["k-1"],
			selectedTextSlot: { objectId: "k-1", slotId: "body" },
		});

		expect(getPropertyPanelSections(state, registry)).toEqual([
			{ id: "text", label: "Text", items: [{ type: "fontSize" }] },
		]);
	});

	it("keeps a section whose isShown accepts the selection", () => {
		const state = stateOf({
			objects: { "g-1": shape("g-1", "gauge") },
			selectedIds: ["g-1"],
		});

		expect(
			getPropertyPanelSections(state, registry).map((section) => section.id),
		).toEqual(["fill", "gauge"]);
	});

	it("drops a section whose isShown turns the selection down, heading and all", () => {
		const state = stateOf({
			objects: {
				"g-1": shape("g-1", "gauge"),
				"g-2": shape("g-2", "gauge"),
			},
			selectedIds: ["g-1", "g-2"],
		});

		expect(
			getPropertyPanelSections(state, registry).map((section) => section.id),
		).toEqual(["fill"]);
	});

	it("keeps only the text section while a shape's text is being edited", () => {
		const state = stateOf({
			objects: { "r-1": shape("r-1", "rect") },
			selectedIds: ["r-1"],
			textEditState: { kind: "shape" },
		} as unknown as Partial<CanvasControllerState>);

		expect(
			getPropertyPanelSections(state, registry).map((section) => section.id),
		).toEqual(["text"]);
	});
});
