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
import { umlPlugin, umlStencilCategory } from "@jiscribe/plugin-uml-shapes";
// The faces the shipped font stacks name. No other e2e harness loads them, which
// is why the PNG export's font embedding — which embeds only what the page has
// actually downloaded — can be exercised here and nowhere else (specs/png-font-embedding).
import "@jiscribe/canvas/fonts.css";
import "katex/dist/katex.min.css";

// Every shipped plugin at once, which is the whole point of this suite: each plugin's own
// harness loads itself alone, so nothing else exercises the shipped set sharing one canvas.
// The arrangement mirrors examples/plugins.tsx — six presets pinned on the bar, one
// category left on it as a flyout so that mechanism stays covered, and the shape library
// sidebar holding the whole set as sections. The shipped hosts leave no flyout on the bar
// (standardToolbarLayout pins the six presets and nothing else). The markdown / sticky
// presets and the eight categories are all plugin-supplied and absent from core's default
// layout.
mountPluginHarness({
	plugins: [
		flowchartPlugin,
		containerPlugin,
		markdownPlugin,
		stickyPlugin,
		umlPlugin,
		generalPlugin,
		annotationPlugin,
		lucideIconPlugin,
		awsShapesPlugin,
	],
	toolbarLayout: [
		{ kind: "preset", presetId: "rect" },
		{ kind: "preset", presetId: "ellipse" },
		{ kind: "preset", presetId: "polyline" },
		{ kind: "preset", presetId: "polygon" },
		{ kind: "preset", presetId: "text" },
		{ kind: "preset", presetId: "sticky" },
		{ kind: "category", category: lucideIconStencilCategory },
	],
	stencilLibrarySections: [
		{
			...basicStencilCategory,
			presetIds: [...basicStencilCategory.presetIds, "sticky", "markdown"],
		},
		flowchartStencilCategory,
		umlStencilCategory,
		containerStencilCategory,
		generalStencilCategory,
		annotationStencilCategory,
		lucideIconStencilCategory,
		awsStencilCategory,
		awsGroupStencilCategory,
	],
});
