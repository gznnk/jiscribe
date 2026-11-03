import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	gcpShapesPlugin,
	gcpStencilCategory,
} from "@jiscribe/plugin-gcp-shapes";

// The only shapes mounted are this package's. A spec failing here is this
// package's own failure.
mountPluginHarness({
	plugins: [gcpShapesPlugin],
	toolbarItems: [{ type: "stencilCategory", category: gcpStencilCategory }],
	// The same category as a sidebar section, for the search and the "show all" view.
	stencilLibrarySections: [gcpStencilCategory],
});
