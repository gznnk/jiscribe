import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import { stickyPlugin } from "@jiscribe/plugin-sticky-shape";

// This package's shapes only, so a spec failing here is this package's own fault.
mountPluginHarness({
	plugins: [stickyPlugin],
	// The rect preset is core's; it is here because CanvasDriver.goto() waits for the
	// "Rectangle" tool. The sticky preset comes from this package's own stencils and is the
	// "Sticky" tool button every spec places with; sticky contributes no category, so a
	// preset entry is all it needs.
	toolbarLayout: [
		{ kind: "preset", presetId: "rect" },
		{ kind: "preset", presetId: "sticky" },
	],
});
