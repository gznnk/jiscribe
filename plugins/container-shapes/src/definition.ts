import { isNumber } from "@workspace/basic-validators";
import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameObjectDefinition } from "@workspace/canvas-sdk";

import { ContainerHeaderHeightControl } from "./controls/ContainerHeaderHeightControl";
import { handleContainerHeaderHeight } from "./controls/handleContainerHeaderHeight";
import { containerDocDefinition } from "./doc";
import { HeaderColorMenu } from "./menu/HeaderColorMenu";
import { calcContainerTextRegion } from "./presentation/calcContainerTextRegion";
import { Container } from "./presentation/Container";
import type { ContainerDoc } from "./schema/ContainerDoc";
import { ContainerExtraStyleProperties } from "./schema/ContainerDoc";
import type { ContainerState } from "./state/ContainerState";
import { ContainerStencils } from "./stencil/ContainerStencils";

/**
 * `containerDefinition` has zero intentional omissions relative to the core
 * container entry (`initializeObjectRegistry.ts`) — same section structure,
 * same items, same `selectionControls`
 * (docs/05_extensibility/plugin-architecture-requirements.md §4 UC1).
 *
 * The `header-color` custom menu item (HeaderColorMenu) is the last piece that
 * was missing (ObjectMenu UI kit, published via `@workspace/canvas-sdk`);
 * it is now restored below.
 */
export const containerDefinition: ObjectTypeDefinition<
	ContainerDoc,
	ContainerState
> = createFrameObjectDefinition<ContainerDoc, ContainerState>({
	doc: containerDocDefinition,
	component: Container,
	textRegion: calcContainerTextRegion,
	extraKeys: ["headerFill", "headerHeight"],
	// The headerHeight bound (>= 1) matches validateContainerHeaderFields and the
	// JSON schema.
	isExtraStateValid: (state) =>
		state.headerHeight === undefined ||
		(isNumber(state.headerHeight) && state.headerHeight >= 1),
	selectionControls: [
		{
			name: "headerHeight",
			Component: ContainerHeaderHeightControl,
			handle: handleContainerHeaderHeight,
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
});
