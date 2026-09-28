import { describe, expect, it } from "vitest";

import type { AnyObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import {
	rectToDoc,
	rectToState,
} from "../../../states/objects/primitives/rect/RectMapper";
import type { RectState } from "../../../states/objects/primitives/rect/RectState";
import { isValidRectState } from "../../../states/objects/primitives/rect/validateRectState";
import { createFrameBehavior } from "../../behaviors/base/FrameController";
import type { ContextMenuContribution } from "../../ui/menu/ContextMenu/ContextMenuTypes";
import { applyObjectDefinition } from "../applyObjectDefinition";
import { createCanvasRegistries } from "../createCanvasRegistries";

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

const contribution: ContextMenuContribution = {
	placement: "after",
	items: [{ type: "separator" }, { type: "command", commandId: "insertRow" }],
};

describe("contextMenu registration", () => {
	it("registers the contribution a definition declares", () => {
		const registries = createCanvasRegistries({ objectTypes: [] });
		applyObjectDefinition(
			registries,
			"grid",
			rectLikeDefinition({ contextMenu: contribution }),
		);

		expect(registries.contextMenu.getContribution("grid")).toEqual(
			contribution,
		);
	});

	// Unlike `menu` and `propertyPanel`, there is no features-derived default to
	// fall back on: nothing registered means the built-in rows alone.
	it("registers nothing for a definition that omits it", () => {
		const registries = createCanvasRegistries({ objectTypes: [] });
		applyObjectDefinition(registries, "plain", rectLikeDefinition({}));

		expect(registries.contextMenu.getContribution("plain")).toBeUndefined();
	});

	it("leaves every built-in type contributing nothing", () => {
		const registries = createCanvasRegistries();

		for (const type of ["rect", "ellipse", "text", "group", "connector"]) {
			expect(
				registries.contextMenu.getContribution(type),
				`${type} adds no context-menu rows`,
			).toBeUndefined();
		}
	});
});
