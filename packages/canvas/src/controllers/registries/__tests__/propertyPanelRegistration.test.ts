import { describe, expect, it } from "vitest";

import type { AnyObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import {
	rectToDoc,
	rectToState,
} from "../../../states/objects/primitives/rect/RectMapper";
import type { RectState } from "../../../states/objects/primitives/rect/RectState";
import { isValidRectState } from "../../../states/objects/primitives/rect/validateRectState";
import { createFrameBehavior } from "../../behaviors/base/FrameController";
import type {
	PropertyPanelItem,
	PropertyPanelSection,
	PropertyPanelSelection,
} from "../../ui/menu/PropertyPanel/PropertyPanelTypes";
import { derivePropertyPanel } from "../../ui/menu/PropertyPanel/utils/derivePropertyPanel";
import { createCanvasRegistries } from "../createCanvasRegistries";
import { applyObjectDefinition } from "../initializeObjectRegistry";

/** A rect-shaped definition, so only what each test varies is under test. */
const rectLikeDefinition = (
	overrides: Partial<AnyObjectTypeDefinition>,
): AnyObjectTypeDefinition =>
	({
		features: {
			type: "rect",
			geometry: "rect",
			transform: true,
			stroke: true,
			fill: true,
		},
		mapper: { toDoc: rectToDoc, toState: rectToState },
		stateValidator: isValidRectState,
		component: () => null,
		behavior: createFrameBehavior<RectState>(),
		...overrides,
	}) as AnyObjectTypeDefinition;

const sectionIdsOf = (sections: PropertyPanelSection[]): string[] =>
	sections.map((section) => section.id);

/** Identity of a row: the discriminator for a built-in kind, the id for a custom one. */
const itemKeyOf = (item: PropertyPanelItem): string =>
	item.type === "custom" ? item.id : item.type;

/** The slice of a selection `isShown` is asked about, holding one selected connector. */
const selectionOfConnector = (
	connectorId: string,
	connector: Record<string, unknown>,
): PropertyPanelSelection => ({
	objects: { [connectorId]: connector as unknown as ObjectState },
	selectedIds: [],
	selectedConnectorId: connectorId,
});

describe("propertyPanel registration", () => {
	it("derives the sections from the features when the definition omits it", () => {
		const registries = createCanvasRegistries({ objectTypes: [] });
		applyObjectDefinition(registries, "derived", rectLikeDefinition({}));

		expect(
			sectionIdsOf(registries.propertyPanel.getSections("derived")),
		).toEqual(["layout", "fill", "stroke"]);
	});

	it("takes a declared array in place of the derived sections", () => {
		const declared: PropertyPanelSection[] = [
			{ id: "custom", label: "Custom", items: [{ type: "rotation" }] },
		];
		const registries = createCanvasRegistries({ objectTypes: [] });
		applyObjectDefinition(
			registries,
			"declared",
			rectLikeDefinition({ propertyPanel: declared }),
		);

		expect(registries.propertyPanel.getSections("declared")).toEqual(declared);
	});

	it("offers nothing for a type declaring an empty array", () => {
		const registries = createCanvasRegistries({ objectTypes: [] });
		applyObjectDefinition(
			registries,
			"silent",
			rectLikeDefinition({ propertyPanel: [] }),
		);

		expect(registries.propertyPanel.getSections("silent")).toEqual([]);
	});

	it("offers nothing for a type that was never registered", () => {
		const registries = createCanvasRegistries({ objectTypes: [] });

		expect(registries.propertyPanel.getSections("unknown")).toEqual([]);
	});

	it("registers what derivePropertyPanel derives for the definition", () => {
		const definition = rectLikeDefinition({
			features: {
				type: "rect",
				geometry: "rect",
				transform: true,
				stroke: true,
				fill: true,
				text: "body",
			},
			// Inset from the top and bottom edge, so both appended switches apply.
			textRegion: (state) => ({
				x: -state.width / 2,
				y: -state.height / 4,
				width: state.width,
				height: state.height / 2,
			}),
		});
		const registries = createCanvasRegistries({ objectTypes: [] });
		applyObjectDefinition(registries, "inset", definition);

		expect(registries.propertyPanel.getSections("inset")).toEqual(
			derivePropertyPanel(definition),
		);
	});

	it("gives the text shape the wrap switch as the last row of its text section", () => {
		const registries = createCanvasRegistries();

		const text = registries.propertyPanel
			.getSections("text")
			.find((section) => section.id === "text");

		expect(text?.items.at(-1)).toEqual({ type: "textLayout" });
	});

	it("gives the connector a line, an arrow, a label and a label-border section", () => {
		const registries = createCanvasRegistries();

		expect(
			sectionIdsOf(registries.propertyPanel.getSections("connector")),
		).toEqual(["line", "arrow", "label", "label-border"]);
	});

	it("puts the routing row at the end of the connector's line section", () => {
		const registries = createCanvasRegistries();

		const line = registries.propertyPanel
			.getSections("connector")
			.find((section) => section.id === "line");

		expect(line?.items.map(itemKeyOf)).toEqual([
			"strokeColor",
			"strokeWidth",
			"strokeDashType",
			"connector-routing",
		]);
	});

	it("holds the label rows in the order they are drawn", () => {
		const registries = createCanvasRegistries();

		const label = registries.propertyPanel
			.getSections("connector")
			.find((section) => section.id === "label");

		expect(label?.items.map(itemKeyOf)).toEqual([
			"label-font-family",
			"label-font-size",
			"label-font-color",
			"label-style",
			"label-background",
		]);
	});

	it("holds the label border rows in a section of their own", () => {
		const registries = createCanvasRegistries();

		const labelBorder = registries.propertyPanel
			.getSections("connector")
			.find((section) => section.id === "label-border");

		expect(labelBorder?.items.map(itemKeyOf)).toEqual([
			"label-border-color",
			"label-border-width",
			"label-border-type",
		]);
	});

	it("offers both label sections only once the selected connector has label text", () => {
		const registries = createCanvasRegistries();
		const labelSections = registries.propertyPanel
			.getSections("connector")
			.filter((section) => section.id.startsWith("label"));
		expect(labelSections).toHaveLength(2);

		for (const section of labelSections) {
			expect(
				section.isShown?.(selectionOfConnector("c-1", { id: "c-1" })),
				`${section.id}: a connector without a label offers nothing to style`,
			).toBe(false);
			expect(
				section.isShown?.(
					selectionOfConnector("c-1", { id: "c-1", label: { text: "" } }),
				),
				`${section.id}: an empty label is the same as none`,
			).toBe(false);
			expect(
				section.isShown?.(
					selectionOfConnector("c-1", { id: "c-1", label: { text: "Yes" } }),
				),
				section.id,
			).toBe(true);
		}
	});
});
