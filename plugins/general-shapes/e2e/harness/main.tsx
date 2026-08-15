import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	generalPlugin,
	generalToolbarEntry,
} from "@jiscribe/plugin-general-shapes";

mountPluginHarness({
	plugins: [generalPlugin],
	// The rect preset is core's; CanvasDriver.goto() waits for the "Rectangle" tool, and
	// connector-lock-shackle-drop draws a rectangle as the connector's source. The general
	// category is what the specs actually drive.
	toolbarLayout: [{ kind: "preset", presetId: "rect" }, generalToolbarEntry],
});
