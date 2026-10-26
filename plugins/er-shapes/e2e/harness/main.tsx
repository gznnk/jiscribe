import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import { erPlugin, erStencilCategory } from "@jiscribe/plugin-er-shapes";

// This package's shapes only, so a spec failing here is this package's own fault.
mountPluginHarness({
	plugins: [erPlugin],
	// The specs place the entity through the category flyout, so the category is pinned.
	// The rect preset is kept because CanvasDriver.goto() waits for the "Rectangle" tool
	// button.
	railPresetIds: ["rect"],
	stencilLibrarySections: [erStencilCategory],
	pinnedCategoryIds: [erStencilCategory.id],
});
