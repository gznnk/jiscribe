// The standard shape set as a host mounts it: the eight plugins a `<Canvas>` is
// configured with, plus the toolbar arrangement that makes their stencils
// reachable. The headless half lives behind ./doc and pulls in no react.
//
// e.g. `import { standardPlugins, standardToolbarLayout } from "@jiscribe/standard-shapes";`
import type { CanvasPlugin, ToolbarEntry } from "@jiscribe/canvas";
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

/**
 * The eight plugins of the standard shape set, in the same order as
 * `standardDocPlugins`. Pass to `CanvasConfig.plugins`; a shape whose plugin is
 * missing is simply not drawn, so this array and the one the parser is given
 * have to describe the same set.
 */
export const standardPlugins: readonly CanvasPlugin[] = [
	flowchartPlugin,
	containerPlugin,
	markdownPlugin,
	stickyPlugin,
	umlPlugin,
	generalPlugin,
	annotationPlugin,
	lucideIconPlugin,
];

/**
 * The toolbar arrangement the standard set is drawn with: the core presets, then
 * the sticky / markdown presets and the six category flyouts the plugins supply.
 * Core's default layout knows none of the latter, so a host that omits a layout
 * gets a canvas whose plugin shapes cannot be drawn by hand.
 *
 * Typed mutable because that is what `Canvas`'s `toolbar.layout` takes; it is one
 * shared array, so a host wanting a different order copies it rather than
 * splicing this one.
 */
export const standardToolbarLayout: ToolbarEntry[] = [
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
];
