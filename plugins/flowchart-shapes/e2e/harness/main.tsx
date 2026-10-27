import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	flowchartPlugin,
	flowchartStencilCategory,
} from "@jiscribe/plugin-flowchart-shapes";

mountPluginHarness({
	plugins: [flowchartPlugin],
	// The flowchart category is what the specs actually drive, and it covers every
	// shape they draw.
	toolbarItems: [
		{ type: "stencilCategory", category: flowchartStencilCategory },
	],
});
