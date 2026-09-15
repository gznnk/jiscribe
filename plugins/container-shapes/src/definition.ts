import { isNumber } from "@jiscribe/basic-validators";
import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import { createFrameObjectDefinition } from "@jiscribe/canvas-sdk";

import { ContainerHeaderHeightControl } from "./controls/ContainerHeaderHeightControl";
import { handleContainerHeaderHeight } from "./controls/handleContainerHeaderHeight";
import { containerDocDefinition } from "./doc";
import { HeaderColorMenu } from "./menu/HeaderColorMenu";
import { Container } from "./presentation/Container";
import { HeaderColorProperty } from "./propertyPanel/HeaderColorProperty";
import { HeaderHeightProperty } from "./propertyPanel/HeaderHeightProperty";
import type { ContainerDoc } from "./schema/ContainerDoc";
import { ContainerExtraStyleProperties } from "./schema/ContainerDoc";
import { calcContainerTextRegion } from "./schema/textRegions";
import type { ContainerState } from "./state/ContainerState";
import { ContainerStencils } from "./stencil/ContainerStencils";

/**
 * `containerDefinition` has zero intentional omissions relative to the core
 * container entry (`applyObjectDefinition.ts`) — same section structure,
 * same items, same `selectionControls`
 * (packages/canvas/docs/13-authoring-plugins.md).
 *
 * The `header-color` custom menu item (HeaderColorMenu) is the last piece that
 * was missing (ObjectMenu UI kit, published via `@jiscribe/canvas-sdk`);
 * it is now restored below.
 *
 * `propertyPanel` states the same sections `createDefaultPropertyPanel` derives
 * from `ContainerFeatures`, with the `header-height` custom row added to the
 * layout section and the `header-fill` one to the fill section. Declaring it does not
 * drop the auto-height and vertical-basis switches: registration appends each where its
 * predicate admits the type (derivePropertyPanel), and container opts out of auto-height
 * in its doc definition.
 */
export const containerDefinition: ObjectTypeDefinition<
	ContainerDoc,
	ContainerState
> = createFrameObjectDefinition<ContainerDoc, ContainerState>({
	doc: containerDocDefinition,
	component: Container,
	textRegion: calcContainerTextRegion,
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
	propertyPanel: [
		{
			id: "layout",
			label: "Layout",
			items: [
				{ type: "position" },
				{ type: "size" },
				{
					type: "custom",
					id: "header-height",
					component: HeaderHeightProperty,
				},
				{ type: "rotation" },
				{ type: "lockAspectRatio" },
			],
		},
		{
			id: "fill",
			label: "Fill",
			items: [
				{ type: "fill" },
				{ type: "custom", id: "header-fill", component: HeaderColorProperty },
				{ type: "fillOpacity" },
			],
		},
		{
			id: "stroke",
			label: "Border",
			items: [
				{ type: "strokeColor" },
				{ type: "strokeWidth" },
				{ type: "strokeDashType" },
				{ type: "strokeOpacity" },
			],
		},
		{
			id: "text",
			label: "Text",
			items: [
				{ type: "fontFamily" },
				{ type: "fontSize" },
				{ type: "fontColor" },
				{ type: "textFormat" },
				{ type: "textAlign" },
				{ type: "verticalAlign" },
			],
		},
	],
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
