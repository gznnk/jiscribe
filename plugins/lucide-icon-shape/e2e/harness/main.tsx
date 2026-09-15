import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	lucideIconPlugin,
	lucideIconStencilCategory,
} from "@jiscribe/plugin-lucide-icon-shape";

// This package's shapes only, so a spec failing here is this package's own fault.
mountPluginHarness({
	plugins: [lucideIconPlugin],
	// The rect preset is core's; it is here because CanvasDriver.goto() waits for the
	// "Rectangle" tool. The icons come from this package's own stencils, as the category
	// every spec opens: the shape is only useful once an icon is picked, so the plugin
	// contributes a flyout to pick from rather than a single pinned preset.
	toolbarItems: [
		{ type: "stencilPreset", presetId: "rect" },
		{ type: "stencilCategory", category: lucideIconStencilCategory },
	],
});
