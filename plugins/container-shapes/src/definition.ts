import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

import { ContainerHeaderHeightControl } from "./controls/ContainerHeaderHeightControl";
import { HeaderHeightControlHandler } from "./controls/HeaderHeightControlHandler";
import { HeaderColorMenu } from "./menu/HeaderColorMenu";
import { calcContainerTextRegion } from "./presentation/calcContainerTextRegion";
import { Container } from "./presentation/Container";
import type { ContainerDoc } from "./schema/ContainerDoc";
import {
	ContainerExtraStyleProperties,
	ContainerFeatures,
} from "./schema/ContainerDoc";
import { ContainerObjectFactory } from "./schema/ContainerObjectFactory";
import { containerToDoc, containerToState } from "./state/ContainerMapper";
import type { ContainerState } from "./state/ContainerState";
import { isValidContainerState } from "./state/validateContainerState";
import { ContainerStencils } from "./stencil/ContainerStencils";

/**
 * `containerDefinition` has zero intentional omissions relative to the core
 * container entry (`initializeObjectRegistry.ts`) — same section structure,
 * same items, same `selectionControls`
 * (docs/05_extensibility/uc1-container-extraction-log.md has the full audit).
 *
 * The `header-color` custom menu item (HeaderColorMenu) is the last piece that
 * was missing (tier 3: ObjectMenu UI kit, published via `@workspace/canvas/unstable`
 * per docs/05_extensibility/custom-menu-design.md); it is now restored below.
 */
export const containerDefinition: ObjectTypeDefinition<
	ContainerDoc,
	ContainerState
> = {
	features: ContainerFeatures,
	mapper: { toDoc: containerToDoc, toState: containerToState },
	stateValidator: isValidContainerState,
	factory: ContainerObjectFactory,
	component: Container,
	textRegion: calcContainerTextRegion,
	behavior: createFrameBehavior<ContainerState>(),
	selectionControls: [
		{
			Component: ContainerHeaderHeightControl,
			handler: new HeaderHeightControlHandler(),
		},
	],
	extraStyleProperties: ContainerExtraStyleProperties,
	stencils: ContainerStencils,
	menu: [
		{
			id: "style",
			items: [
				{ type: "backgroundColor" },
				{ type: "custom", id: "header-color", component: HeaderColorMenu },
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
};
