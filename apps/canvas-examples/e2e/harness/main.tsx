import { basicStencilCategory } from "@jiscribe/canvas";
import { mountPluginHarness } from "@jiscribe/canvas/testing/harness";
import {
	annotationPlugin,
	annotationStencilCategory,
} from "@jiscribe/plugin-annotation-shapes";
import {
	awsGroupStencilCategory,
	awsShapesPlugin,
	awsStencilCategory,
} from "@jiscribe/plugin-aws-shapes";
import {
	containerPlugin,
	containerStencilCategory,
} from "@jiscribe/plugin-container-shapes";
import { erPlugin, erStencilCategory } from "@jiscribe/plugin-er-shapes";
import {
	flowchartPlugin,
	flowchartStencilCategory,
} from "@jiscribe/plugin-flowchart-shapes";
import {
	generalPlugin,
	generalStencilCategory,
} from "@jiscribe/plugin-general-shapes";
import {
	lucideIconPlugin,
	lucideIconStencilCategory,
} from "@jiscribe/plugin-lucide-icon-shape";
import { markdownPlugin } from "@jiscribe/plugin-markdown-shape";
import { stickyPlugin } from "@jiscribe/plugin-sticky-shape";
import { tablePlugin } from "@jiscribe/plugin-table-shape";
import { umlPlugin, umlStencilCategory } from "@jiscribe/plugin-uml-shapes";
// The faces the shipped font stacks name. No other e2e harness loads them, which
// is why the PNG export's font embedding — which embeds only what the page has
// actually downloaded — can be exercised here and nowhere else (specs/png-font-embedding).
import "@jiscribe/canvas/fonts.css";
import "katex/dist/katex.min.css";

// Every shipped plugin at once, which is the whole point of this suite: each plugin's own
// harness loads itself alone, so nothing else exercises the shipped set sharing one canvas.
// The shapes are arranged as in examples/plugins.tsx — six presets pinned on the stencil
// bar, one category left on the top bar as a flyout so that mechanism stays covered, and the
// shape library sidebar holding the whole set as sections; the sidebar controls are the
// kit's (see mountPluginHarness). The shipped hosts leave no
// flyout on the top bar (standardToolbarSections carries no shape tool at all). The
// markdown / sticky presets and the nine categories are all plugin-supplied and absent from
// core's defaults.
mountPluginHarness({
	plugins: [
		flowchartPlugin,
		containerPlugin,
		markdownPlugin,
		stickyPlugin,
		tablePlugin,
		umlPlugin,
		erPlugin,
		generalPlugin,
		annotationPlugin,
		lucideIconPlugin,
		awsShapesPlugin,
	],
	toolbarItems: [
		{ type: "stencilCategory", category: lucideIconStencilCategory },
	],
	stencilBarPresetIds: [
		"rect",
		"ellipse",
		"polyline",
		"polygon",
		"text",
		"sticky",
	],
	stencilLibrarySections: [
		{
			...basicStencilCategory,
			presetIds: [
				...basicStencilCategory.presetIds,
				"sticky",
				"markdown",
				"table",
			],
		},
		flowchartStencilCategory,
		umlStencilCategory,
		erStencilCategory,
		containerStencilCategory,
		generalStencilCategory,
		annotationStencilCategory,
		lucideIconStencilCategory,
		awsStencilCategory,
		awsGroupStencilCategory,
	],
});
