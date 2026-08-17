import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import { lucideIconPlugin } from "@jiscribe/plugin-lucide-icon-shape";

// This package's shapes only, so a spec failing here is this package's own fault.
mountPluginHarness({
	plugins: [lucideIconPlugin],
	// The rect preset is core's; it is here because CanvasDriver.goto() waits for the
	// "Rectangle" tool. The icon preset comes from this package's own stencils and is the
	// "Icon" tool button every spec places with; icon contributes no category, so a
	// preset entry is all it needs.
	toolbarLayout: [
		{ kind: "preset", presetId: "rect" },
		{ kind: "preset", presetId: "lucideIcon" },
	],
});
