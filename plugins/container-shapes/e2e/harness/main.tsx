import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	containerPlugin,
	containerStencilCategory,
} from "@jiscribe/plugin-container-shapes";

mountPluginHarness({
	plugins: [containerPlugin],
	// The container specs reach every container stencil through the category flyout, so
	// the tool section only needs that item and the rect preset, for the rectangle
	// container.spec draws beside a container.
	toolbarItems: [
		{ type: "stencilPreset", presetId: "rect" },
		{ type: "stencilCategory", category: containerStencilCategory },
	],
});
