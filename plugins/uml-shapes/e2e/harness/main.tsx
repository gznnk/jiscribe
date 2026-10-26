import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import { umlPlugin, umlStencilCategory } from "@jiscribe/plugin-uml-shapes";

mountPluginHarness({
	plugins: [umlPlugin],
	// The uml specs reach every record stencil through the category flyout, so that
	// category is pinned. The rect preset is kept because CanvasDriver.goto() waits for
	// the "Rectangle" tool.
	railPresetIds: ["rect"],
	stencilLibrarySections: [umlStencilCategory],
	pinnedCategoryIds: [umlStencilCategory.id],
});
