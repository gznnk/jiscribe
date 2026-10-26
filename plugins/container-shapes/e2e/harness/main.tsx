import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	containerPlugin,
	containerStencilCategory,
} from "@jiscribe/plugin-container-shapes";

mountPluginHarness({
	plugins: [containerPlugin],
	// The container specs reach every container stencil through the category flyout, so
	// that category is pinned. The rect preset is kept because CanvasDriver.goto() waits
	// for the "Rectangle" tool button.
	railPresetIds: ["rect"],
	stencilLibrarySections: [containerStencilCategory],
	pinnedCategoryIds: [containerStencilCategory.id],
});
