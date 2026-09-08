import { describe, expect, it } from "vitest";

import type { AnyObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import {
	rectToDoc,
	rectToState,
} from "../../../states/objects/primitives/rect/RectMapper";
import type { RectState } from "../../../states/objects/primitives/rect/RectState";
import { isValidRectState } from "../../../states/objects/primitives/rect/validateRectState";
import { createFrameBehavior } from "../../behaviors/base/FrameController";
import type { PropertyPanelSection } from "../../ui/menu/PropertyPanel/PropertyPanelTypes";
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

	it("adds the auto-height switch to the layout section of a type that may take it", () => {
		const registries = createCanvasRegistries();

		const layout = registries.propertyPanel
			.getSections("rect")
			.find((section) => section.id === "layout");

		expect(layout?.items.map((item) => item.type)).toEqual([
			"position",
			"size",
			"rotation",
			"lockAspectRatio",
			"autoHeight",
		]);
	});

	it("leaves the switch off a type whose height never follows its text", () => {
		const registries = createCanvasRegistries();

		const layout = registries.propertyPanel
			.getSections("svg")
			.find((section) => section.id === "layout");

		expect(layout?.items.map((item) => item.type)).toEqual([
			"position",
			"size",
			"rotation",
			"lockAspectRatio",
		]);
	});

	it("adds the vertical-basis switch to the text section of a type whose outline insets its text", () => {
		const registries = createCanvasRegistries();

		const text = registries.propertyPanel
			.getSections("ellipse")
			.find((section) => section.id === "text");

		expect(text?.items.at(-1)).toEqual({ type: "textVerticalBasis" });
	});

	it("leaves the vertical-basis switch off a type drawn with its whole box", () => {
		const registries = createCanvasRegistries();

		const text = registries.propertyPanel
			.getSections("rect")
			.find((section) => section.id === "text");

		expect(text?.items.some((item) => item.type === "textVerticalBasis")).toBe(
			false,
		);
	});

	it("gives the text shape the wrap switch as the last row of its text section", () => {
		const registries = createCanvasRegistries();

		const text = registries.propertyPanel
			.getSections("text")
			.find((section) => section.id === "text");

		expect(text?.items.at(-1)).toEqual({ type: "textLayout" });
	});
});
