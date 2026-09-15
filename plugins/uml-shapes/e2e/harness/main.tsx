import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import { umlPlugin, umlStencilCategory } from "@jiscribe/plugin-uml-shapes";

mountPluginHarness({
	plugins: [umlPlugin],
	// The uml specs reach every record stencil through the category flyout, so the
	// tool section only needs that item. The rect preset is kept because
	// CanvasDriver.goto() waits for the "Rectangle" tool button.
	toolbarItems: [
		{ type: "stencilPreset", presetId: "rect" },
		{ type: "stencilCategory", category: umlStencilCategory },
	],
});
