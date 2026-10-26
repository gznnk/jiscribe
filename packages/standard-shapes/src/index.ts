// The standard shape set as a host mounts it: the eleven plugins a `<Canvas>` is
// configured with, plus the declarations that make their stencils reachable —
// the rail's presets, the stencil library and the categories pinned to start
// with — and the toolbar it is drawn with. The headless half lives behind ./doc
// and pulls in no react.
//
// e.g. `import { standardPlugins, standardRailPresetIds,
//        standardStencilLibrarySections } from "@jiscribe/standard-shapes";`
import type {
	CanvasPlugin,
	StencilCategory,
	ToolbarSection,
} from "@jiscribe/canvas";
import {
	basicStencilCategory,
	DEFAULT_RAIL_PRESET_IDS,
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_PROPERTIES_SECTION,
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
 * The presets on the rail for the standard set: core's primitives, then
 * `sticky`, the six a diagram is mostly built out of. Pass as `Canvas`'s
 * `rail.presetIds`. Everything else the set ships — the `markdown` and `table`
 * presets and the nine plugin categories — is reached through the library
 * ({@link standardStencilLibrarySections}): its pinned categories and its
 * catalog.
 *
 * Typed readonly: it is one shared array, so a host wanting a different order
 * copies it rather than splicing this one.
 */
export const standardRailPresetIds: readonly string[] = [
	...DEFAULT_RAIL_PRESET_IDS,
	"sticky",
];

/**
 * The categories a host pins to the rail when it has no pins of the user's to
 * restore — flowchart, general, container, in that rail order: pass as
 * `initialConfig.pinnedCategoryIds` on a first mount, and the pins
 * `onPinnedCategoriesChange` reported on every mount after that. The canvas
 * pins nothing on its own, so a host passing nothing starts with no category on
 * the rail.
 */
export const standardDefaultPinnedCategoryIds: readonly string[] = [
	flowchartStencilCategory.id,
	generalStencilCategory.id,
	containerStencilCategory.id,
];

/**
 * The whole toolbar the standard set is drawn with: core's history, view and
 * properties sections unchanged. The shape tools are on the rail
 * ({@link standardRailPresetIds}), so the bar carries no stencil of its own.
 *
 * Typed mutable because that is what `Canvas`'s `toolbar.sections` takes; it is
 * one shared array, so a host wanting a different order copies it rather than
 * splicing this one.
 */
export const standardToolbarSections: ToolbarSection[] = [
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_VIEW_SECTION,
	DEFAULT_TOOLBAR_PROPERTIES_SECTION,
];

/**
 * The sections of the stencil library for the standard set, in display order:
 * the primitives first, then one section per plugin category (aws-shapes
 * contributing two — its icons and the frames drawn around them). Pass to
 * `Canvas`'s `stencilLibrary.sections` beside {@link standardRailPresetIds} —
 * the rail holds only the six most-used presets, and this is where the rest of
 * the set lives, reached through the rail's pinned categories and its catalog.
 *
 * The `basic` section is composed here rather than taken from core: the
 * `sticky` / `markdown` / `table` presets belong with the primitives rather than
 * in a category of their own.
 *
 * Typed mutable for the same reason as {@link standardToolbarSections}.
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
