import { describe, expect, it } from "vitest";

import type { AnyObjectTypeDefinition } from "../../../../../../plugin/ObjectTypeDefinition";
import {
	rectToDoc,
	rectToState,
} from "../../../../../../states/objects/primitives/rect/RectMapper";
import type { RectState } from "../../../../../../states/objects/primitives/rect/RectState";
import { isValidRectState } from "../../../../../../states/objects/primitives/rect/validateRectState";
import { createFrameBehavior } from "../../../../../behaviors/base/FrameController";
import { ALL_OBJECT_DEFINITIONS } from "../../../../../registries/initializeObjectRegistry";
import type { PropertyPanelSection } from "../../PropertyPanelTypes";
import { derivePropertyPanel } from "../derivePropertyPanel";

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

/**
 * A body inset from the top and bottom edge at every probed box, which is what
 * both switches ask for: a region the box holds (auto height) and one narrower
 * than the box (vertical basis).
 */
const insetTextRegionOverrides: Partial<AnyObjectTypeDefinition> = {
	features: {
		type: "rect",
		geometry: "rect",
		transform: true,
		stroke: true,
		fill: true,
		text: "body",
	},
	textRegion: (state) => ({
		x: -state.width / 2,
		y: -state.height / 4,
		width: state.width,
		height: state.height / 2,
	}),
};

const sectionIdsOf = (sections: PropertyPanelSection[]): string[] =>
	sections.map((section) => section.id);

const itemsOf = (
	sections: PropertyPanelSection[],
	id: string,
): string[] | undefined =>
	sections.find((section) => section.id === id)?.items.map((item) => item.type);

describe("derivePropertyPanel", () => {
	it("derives the sections from the features when the definition omits them", () => {
		expect(sectionIdsOf(derivePropertyPanel(rectLikeDefinition({})))).toEqual([
			"layout",
			"fill",
			"stroke",
		]);
	});

	it("takes a declared array in place of the derived sections", () => {
		const declared: PropertyPanelSection[] = [
			{ id: "custom", label: "Custom", items: [{ type: "rotation" }] },
		];

		expect(
			derivePropertyPanel(rectLikeDefinition({ propertyPanel: declared })),
		).toEqual(declared);
	});

	it("offers nothing for a type declaring an empty array", () => {
		expect(
			derivePropertyPanel(rectLikeDefinition({ propertyPanel: [] })),
		).toEqual([]);
	});

	it("still appends the switches a type declaring an empty array implies", () => {
		expect(
			derivePropertyPanel(
				rectLikeDefinition({ ...insetTextRegionOverrides, propertyPanel: [] }),
			),
		).toEqual([
			{ id: "layout", label: "Layout", items: [{ type: "autoHeight" }] },
			{ id: "text", label: "Text", items: [{ type: "textVerticalBasis" }] },
		]);
	});

	it("adds the auto-height switch to the layout section of a type that may take it", () => {
		expect(
			itemsOf(derivePropertyPanel(ALL_OBJECT_DEFINITIONS.rect), "layout"),
		).toEqual([
			"position",
			"size",
			"rotation",
			"lockAspectRatio",
			"autoHeight",
		]);
	});

	it("leaves the switch off a type whose height never follows its text", () => {
		expect(
			itemsOf(derivePropertyPanel(ALL_OBJECT_DEFINITIONS.svg), "layout"),
		).toEqual(["position", "size", "rotation", "lockAspectRatio"]);
	});

	it("adds the vertical-basis switch to the text section of a type whose outline insets its text", () => {
		const text = derivePropertyPanel(ALL_OBJECT_DEFINITIONS.ellipse).find(
			(section) => section.id === "text",
		);

		expect(text?.items.at(-1)).toEqual({ type: "textVerticalBasis" });
	});

	it("leaves the vertical-basis switch off a type drawn with its whole box", () => {
		const text = derivePropertyPanel(ALL_OBJECT_DEFINITIONS.rect).find(
			(section) => section.id === "text",
		);

		expect(text?.items.some((item) => item.type === "textVerticalBasis")).toBe(
			false,
		);
	});
});
