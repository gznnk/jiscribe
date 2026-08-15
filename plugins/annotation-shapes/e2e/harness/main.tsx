import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	annotationPlugin,
	annotationToolbarEntry,
} from "@jiscribe/plugin-annotation-shapes";

// This package's shapes only, so a spec failing here is this package's own fault.
mountPluginHarness({
	plugins: [annotationPlugin],
	// The annotation category is plugin-supplied and absent from core's default layout, and
	// every spec draws out of its flyout. The rect preset is there for CanvasDriver.goto(),
	// which waits on the "Rectangle" tool button before handing the page over.
	toolbarLayout: [{ kind: "preset", presetId: "rect" }, annotationToolbarEntry],
});
