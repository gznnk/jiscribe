import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	annotationPlugin,
	annotationStencilCategory,
} from "@jiscribe/plugin-annotation-shapes";

// This package's shapes only, so a spec failing here is this package's own fault.
mountPluginHarness({
	plugins: [annotationPlugin],
	// The annotation category is plugin-supplied and absent from core's default bar, and
	// every spec draws out of its flyout.
	toolbarItems: [
		{ type: "stencilCategory", category: annotationStencilCategory },
	],
});
