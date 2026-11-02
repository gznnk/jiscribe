import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	azureShapesPlugin,
	azureStencilCategory,
} from "@jiscribe/plugin-azure-shapes";

// The only shapes mounted are this package's. A spec failing here is this
// package's own failure.
mountPluginHarness({
	plugins: [azureShapesPlugin],
	toolbarItems: [{ type: "stencilCategory", category: azureStencilCategory }],
	// The same category as a sidebar section, for the search and the "show all" view.
	stencilLibrarySections: [azureStencilCategory],
});
