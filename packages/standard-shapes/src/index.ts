// The standard shape set as a host mounts it: the nine plugins a `<Canvas>` is
// configured with, plus the two declarations that make their stencils reachable —
// the toolbar sections and the shape library sidebar. The headless half lives
// behind ./doc and pulls in no react.
//
// e.g. `import { standardPlugins, standardToolbarSections,
//        standardStencilLibrarySections } from "@jiscribe/standard-shapes";`
import type {
	CanvasPlugin,
	StencilCategory,
	ToolbarSection,
} from "@jiscribe/canvas";
import {
	basicStencilCategory,
	DEFAULT_TOOLBAR_VIEW_SECTION,
} from "@jiscribe/canvas";
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

/**
 * The nine plugins of the standard shape set, in the same order as
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
	awsShapesPlugin,
];

/**
 * The whole toolbar the standard set is drawn with: the six presets a diagram is
 * mostly built out of pinned straight on the bar, the shape library toggle, and
 * core's view controls ({@link DEFAULT_TOOLBAR_VIEW_SECTION}) at the far end.
 * Everything else the set ships — the `markdown` preset and the eight plugin
 * categories — is reached through the shape library sidebar instead, so pass
 * `standardStencilLibrarySections` alongside this or those shapes become
 * undrawable by hand.
 *
 * The toggle is declared here because a section says exactly what is on the bar:
 * it is no longer added on the host's behalf just because a library exists.
 *
 * Core's default bar knows nothing of `sticky` either, so a host that passes no
 * sections gets a canvas short of even the pinned set.
 *
 * Typed mutable because that is what `Canvas`'s `toolbar.sections` takes; it is
 * one shared array, so a host wanting a different order copies it rather than
 * splicing this one.
 */
export const standardToolbarSections: ToolbarSection[] = [
	{
		id: "tools",
		items: [
			{ type: "stencilPreset", presetId: "rect" },
			{ type: "stencilPreset", presetId: "ellipse" },
			{ type: "stencilPreset", presetId: "polyline" },
			{ type: "stencilPreset", presetId: "polygon" },
			{ type: "stencilPreset", presetId: "text" },
			{ type: "stencilPreset", presetId: "sticky" },
			{ type: "divider" },
			{ type: "stencilLibraryToggle" },
		],
	},
	DEFAULT_TOOLBAR_VIEW_SECTION,
];

/**
 * The sections of the shape library sidebar for the standard set, in display
 * order: the primitives first, then one section per plugin category (aws-shapes
 * contributing two — its icons and the frames drawn around them). Pass to
 * `Canvas`'s `stencilLibrary.sections` beside {@link standardToolbarSections} —
 * the bar pins only the six most-used presets, and this is where the rest of the
 * set lives.
 *
 * The `basic` section is composed here rather than taken from core: core pins its
 * primitives on the bar and the `sticky` / `markdown` presets belong with them
 * rather than in a category of their own.
 *
 * Typed mutable for the same reason as {@link standardToolbarSections}.
 */
export const standardStencilLibrarySections: StencilCategory[] = [
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
];
