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
import {
	lucideIconPlugin,
	lucideIconToolbarEntry,
} from "@jiscribe/plugin-lucide-icon-shape";
import { markdownPlugin } from "@jiscribe/plugin-markdown-shape";
import { stickyPlugin } from "@jiscribe/plugin-sticky-shape";
import { umlPlugin, umlToolbarEntry } from "@jiscribe/plugin-uml-shapes";
// The faces the shipped font stacks name. No other e2e harness loads them, which
// is why the PNG export's font embedding — which embeds only what the page has
// actually downloaded — can be exercised here and nowhere else (specs/png-font-embedding).
import "@jiscribe/canvas/fonts.css";
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
		flowchartToolbarEntry,
		umlToolbarEntry,
		containerToolbarEntry,
		generalToolbarEntry,
		annotationToolbarEntry,
		lucideIconToolbarEntry,
	],
});
