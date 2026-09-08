import { describe, expect, it } from "vitest";

import type { AnyObjectTypeDefinition } from "../../../../../plugin/ObjectTypeDefinition";
import {
	rectToDoc,
	rectToState,
} from "../../../../../states/objects/primitives/rect/RectMapper";
import type { RectState } from "../../../../../states/objects/primitives/rect/RectState";
import { isValidRectState } from "../../../../../states/objects/primitives/rect/validateRectState";
import { createFrameBehavior } from "../../../../behaviors/base/FrameController";
import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { applyObjectDefinition } from "../../../../registries/initializeObjectRegistry";
import { createPropertyPanelRegistry } from "../PropertyPanelRegistry";
import type { PropertyPanelSection } from "../PropertyPanelTypes";

/** Stands in for a plugin's row component; only its identity is compared. */
const HeaderRow = (): null => null;

const SECTIONS_WITH_CUSTOM_ROW: PropertyPanelSection[] = [
	{
		id: "fill",
		label: "Fill",
		items: [
			{ type: "fill" },
			{ type: "custom", id: "header-fill", component: HeaderRow },
		],
	},
];

/** A rect-shaped definition, so only the declared sections are under test. */
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

describe("PropertyPanelRegistry", () => {
	it("returns a registered custom row with its component identity intact", () => {
		const registry = createPropertyPanelRegistry();
		registry.register("container", SECTIONS_WITH_CUSTOM_ROW);

		const [fill] = registry.getSections("container");
		expect(fill.items[1]).toEqual({
			type: "custom",
			id: "header-fill",
			component: HeaderRow,
		});
	});

	it("carries a definition's custom row through registration", () => {
		const registries = createCanvasRegistries({ objectTypes: [] });
		applyObjectDefinition(
			registries,
			"container",
			rectLikeDefinition({ propertyPanel: SECTIONS_WITH_CUSTOM_ROW }),
		);

		const fill = registries.propertyPanel
			.getSections("container")
			.find((section) => section.id === "fill");
		expect(fill?.items).toEqual(SECTIONS_WITH_CUSTOM_ROW[0].items);
	});
});
