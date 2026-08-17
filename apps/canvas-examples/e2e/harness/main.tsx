import { mountPluginHarness } from "@jiscribe/canvas/testing/harness";
import {
	annotationPlugin,
	annotationToolbarEntry,
} from "@jiscribe/plugin-annotation-shapes";
import {
	containerPlugin,
	containerToolbarEntry,
} from "@jiscribe/plugin-container-shapes";
import {
	flowchartPlugin,
	flowchartToolbarEntry,
} from "@jiscribe/plugin-flowchart-shapes";
import {
	generalPlugin,
	generalToolbarEntry,
} from "@jiscribe/plugin-general-shapes";
import { lucideIconPlugin } from "@jiscribe/plugin-lucide-icon-shape";
import { markdownPlugin } from "@jiscribe/plugin-markdown-shape";
import { stickyPlugin } from "@jiscribe/plugin-sticky-shape";
import { umlPlugin, umlToolbarEntry } from "@jiscribe/plugin-uml-shapes";
import "katex/dist/katex.min.css";

// Every shipped plugin at once, which is the whole point of this suite: each plugin's own
// harness loads itself alone, so nothing else exercises the shipped set sharing one canvas.
// The layout mirrors the arrangement the apps compose — the markdown / sticky presets and
// the flowchart / uml / container / general / annotation categories are all plugin-supplied
// and absent from core's default layout.
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
	],
	toolbarLayout: [
		{ kind: "preset", presetId: "rect" },
		{ kind: "preset", presetId: "ellipse" },
		{ kind: "preset", presetId: "polyline" },
		{ kind: "preset", presetId: "polygon" },
		{ kind: "preset", presetId: "text" },
		{ kind: "preset", presetId: "sticky" },
		{ kind: "preset", presetId: "markdown" },
		{ kind: "preset", presetId: "lucideIcon" },
		flowchartToolbarEntry,
		umlToolbarEntry,
		containerToolbarEntry,
		generalToolbarEntry,
		annotationToolbarEntry,
	],
});
