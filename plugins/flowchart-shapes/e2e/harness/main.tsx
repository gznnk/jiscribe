import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	flowchartPlugin,
	flowchartToolbarEntry,
} from "@jiscribe/plugin-flowchart-shapes";

mountPluginHarness({
	plugins: [flowchartPlugin],
	// The rect preset is core's; it is here because CanvasDriver.goto() waits for the
	// "Rectangle" tool. The flowchart category is what the specs actually drive, and it
	// covers every shape they draw.
	toolbarLayout: [{ kind: "preset", presetId: "rect" }, flowchartToolbarEntry],
});
