import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	awsGroupStencilCategory,
	awsShapesPlugin,
	awsStencilCategory,
} from "@jiscribe/plugin-aws-shapes";

// The only shapes mounted are this package's. A spec failing here is this
// package's own failure.
mountPluginHarness({
	plugins: [awsShapesPlugin],
	// rect is a core preset; aws-group-connect draws a rectangle to connect into a
	// group. Both AWS categories go up: the icons and the frames are separate
	// sections, and the specs open either flyout.
	toolbarItems: [
		{ type: "stencilPreset", presetId: "rect" },
		{ type: "stencilCategory", category: awsStencilCategory },
		{ type: "stencilCategory", category: awsGroupStencilCategory },
	],
});
