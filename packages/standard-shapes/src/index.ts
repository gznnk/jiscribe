// The standard shape set as a host mounts it: the eleven plugins a `<Canvas>` is
// configured with, plus the declarations that make their stencils reachable —
// the toolbar sections, the bottom tool bar's presets and the shape library
// sidebar. The headless half lives behind ./doc and pulls in no react.
//
// e.g. `import { standardPlugins, standardToolbarSections,
//        standardBottomToolbarPresetIds,
//        standardStencilLibrarySections } from "@jiscribe/standard-shapes";`
import type {
	CanvasPlugin,
	StencilCategory,
	ToolbarSection,
} from "@jiscribe/canvas";
import {
	basicStencilCategory,
	DEFAULT_TOOLBAR_HELP_SECTION,
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION,
	DEFAULT_TOOLBAR_SIDEBARS_SECTION,
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

/**
 * The eleven plugins of the standard shape set, in the same order as
 * `standardDocPlugins`. Pass to `CanvasConfig.plugins`; a shape whose plugin is
 * missing is simply not drawn, so this array and the one the parser is given
 * have to describe the same set.
 */
export const standardPlugins: readonly CanvasPlugin[] = [
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
];

/**
 * The presets the standard set pins on the bottom tool bar, in display order:
 * the six a diagram is mostly built out of, ordered area → line → text.
 * Everything else the set ships — the `markdown` and `table` presets and the
 * nine plugin categories — is reached through the shape library sidebar
 * instead, so pass `standardStencilLibrarySections` alongside this or those
 * shapes become undrawable by hand.
 *
 * Pass as `Canvas`'s `bottomToolbar.presetIds`. Core's default bottom bar knows
 * nothing of `sticky`, so a host that passes none gets one short of the set.
 */
export const standardBottomToolbarPresetIds: readonly string[] = [
	"rect",
	"ellipse",
	"polygon",
	"polyline",
	"text",
	"sticky",
];

/**
 * The shape tools the standard set's top bar used to open with: the shape
 * library toggle, then {@link standardBottomToolbarPresetIds} pinned on the
 * bar. No longer part of {@link standardToolbarSections}, whose presets moved
 * to the bottom tool bar; kept for a host that wants them on top, which then
 * passes `bottomToolbar: { show: false }` so they do not show twice.
 *
 * Typed mutable because that is what `Canvas`'s `toolbar.sections` takes; it is
 * one shared array, so a host wanting a different order copies it rather than
 * splicing this one.
 */
export const standardToolbarToolsSection: ToolbarSection = {
	id: "tools",
	items: [
		{ type: "stencilLibraryToggle" },
		{ type: "divider" },
		...standardBottomToolbarPresetIds.map((presetId) => ({
			type: "stencilPreset" as const,
			presetId,
		})),
	],
};

/**
 * The whole top bar the standard set is drawn with: core's history, view and
 * help sections and the toggles for each sidebar, then the switch for both
 * sidebars at the far right. No shape tools: the presets are on
 * the bottom tool bar ({@link standardBottomToolbarPresetIds}) and the rest of
 * the set in the shape library sidebar the switch opens.
 *
 * Typed mutable for the same reason as {@link standardToolbarToolsSection}.
 */
export const standardToolbarSections: ToolbarSection[] = [
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_VIEW_SECTION,
	DEFAULT_TOOLBAR_HELP_SECTION,
	DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION,
	DEFAULT_TOOLBAR_SIDEBARS_SECTION,
];

/**
 * The sections of the shape library sidebar for the standard set, in display
 * order: the primitives first, then one section per plugin category (aws-shapes
 * contributing two — its icons and the frames drawn around them). Pass to
 * `Canvas`'s `stencilLibrary.sections` beside {@link standardToolbarSections}
 * and {@link standardBottomToolbarPresetIds} — the bottom bar pins only the six
 * most-used presets, and this is where the rest of the set lives.
 *
 * The `basic` section is composed here rather than taken from core: the
 * `sticky` / `markdown` / `table` presets belong with core's primitives rather
 * than in a category of their own.
 *
 * Typed mutable for the same reason as {@link standardToolbarToolsSection}.
 */
export const standardStencilLibrarySections: StencilCategory[] = [
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
];
