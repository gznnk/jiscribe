import type { ObjectTypeDefinition } from "@workspace/canvas";
import { defineObject } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

import { calcContainerTextRegion } from "./presentation/calcContainerTextRegion";
import { Container } from "./presentation/Container";
import { ContainerPreview } from "./presentation/ContainerPreview";
import {
	ContainerExtraStyleProperties,
	ContainerFeatures,
} from "./schema/ContainerDoc";
import { ContainerShapeFactory } from "./schema/ContainerShapeFactory";
import { containerToDoc, containerToState } from "./state/ContainerMapper";
import type { ContainerState } from "./state/ContainerState";
import { isValidContainerState } from "./state/validateContainerState";
import { ContainerShapePresets } from "./ui/ContainerShapePresets";

/**
 * `containerDefinition` intentionally omits two pieces of the core definition
 * (docs/05_extensibility/uc1-container-extraction-log.md has the full audit):
 *
 * - `selectionControls` (HeaderHeightControlHandler + ContainerHeaderHeightControl):
 *   the handler must extend the base `SelectionControlHandler`, whose supporting
 *   types (control-strategy dispatch, CanvasControllerState internals) are not
 *   published — that is G3 / Stage 2 scope, not tier 2.
 * - The `header-color` custom menu item (HeaderColorMenu): needs the ObjectMenu UI
 *   kit (DropdownPanel / ColorPickerGrid / CanvasMessagesContext / icons), which is
 *   tier 3 (unpublished). `menuFactory` below is built only from standard builtin
 *   item types (backgroundColor / borderColor / borderStyle / fontStyle /
 *   textAlignment / aspectRatio), mirroring the core container entry minus the
 *   custom item.
 */
export const containerDefinition: ObjectTypeDefinition = defineObject({
	mapper: { toDoc: containerToDoc, toState: containerToState },
	features: ContainerFeatures,
	extraStyleProperties: ContainerExtraStyleProperties,
	component: Container,
	textRegion: calcContainerTextRegion,
	behavior: createFrameBehavior<ContainerState>(),
	menuFactory: (_state) => [
		{
			id: "style",
			items: [
				{ type: "backgroundColor" },
				{ type: "borderColor" },
				{ type: "borderStyle", radius: false },
			],
		},
		{
			id: "text",
			items: [{ type: "fontStyle" }, { type: "textAlignment" }],
		},
		{
			id: "transform",
			items: [{ type: "aspectRatio" }],
		},
	],
	validateState: isValidContainerState,
	shapeLibrary: {
		factory: ContainerShapeFactory,
		previewRenderer: ContainerPreview,
		presets: ContainerShapePresets,
	},
});
