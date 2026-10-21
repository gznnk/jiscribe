import { resolveViewPadding } from "@jiscribe/doc/model/canvas/resolveViewPadding";
import type { ResolvedViewPadding } from "@jiscribe/doc/model/canvas/ViewDoc";
import { convertRectToBoundingBox } from "@jiscribe/geometry";
import type { BoundingBox, Rect } from "@jiscribe/geometry";

import { buildIdsWithAncestors } from "./buildIdsWithAncestors";
import { calcContentBounds } from "./calcContentBounds";
import { calcObjectsBoundingBox } from "./calcObjectBoundingBox";
import { calcVisibleWorldRect } from "./calcVisibleWorldRect";
import { getTopLevelSelectedIds } from "./getTopLevelSelectedIds";
import type { SnapshotRenderScope } from "./SnapshotRenderScope";
import type { VisualExtentRegistries } from "./VisualExtentRegistries";
import type { BuildExportSvgOptions, RasterizeSvgOptions } from "../../export";
import type { Viewport } from "../../rendering/Viewport";
import { canvasToDoc } from "../../states/canvas/CanvasMapper";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import {
	collectSelectionSubset,
	type SelectionSubset,
} from "../selection/readers/collectSelectionSubset";

/**
 * Fallback margin (world px) kept around the content in exported images, used
 * where neither the caller nor the document says otherwise. Also absorbs extents
 * the content bounds do not account for (stroke widths, arrow heads). A
 * document's `view.padding`, the export dialog and {@link CanvasExportOptions}
 * all take precedence over it.
 */
export const EXPORT_FIT_PADDING = 16;

/**
 * What part of the world an export covers.
 *
 * Every value but an isolated `{ ids }` crops rather than filters: whatever is
 * drawn inside the region is exported, including the parts of shapes that only
 * reach into it.
 *
 * - `"content"` (the default): everything on the canvas, `margin` around it.
 * - `"viewport"`: exactly what the view shows right now, `margin` ignored.
 * - `{ ids }`: the extent of those objects, `margin` around it — the way to get
 *   one corner of a large diagram at a resolution worth looking at. With
 *   `isolate`, only those objects are drawn (see {@link CanvasExportIdsRegion}).
 * - a `Rect`: that world rect exactly, `margin` ignored.
 */
export type CanvasExportRegion =
	"content" | "viewport" | CanvasExportIdsRegion | Rect;

/** The `{ ids }` form of {@link CanvasExportRegion}: the region named by objects. */
export type CanvasExportIdsRegion = {
	/**
	 * The objects whose extent the region is. Ids not on the canvas are skipped;
	 * when none of them draws anything the export rejects.
	 */
	ids: readonly string[];
	/**
	 * Whether to draw only the named objects (default false, which crops: anything
	 * else inside their extent is in the image too). When true the image holds the
	 * named objects with their descendants and the connectors whose attached ends
	 * are all on them — the set Copy takes — and nothing else; a named child of a
	 * group is drawn without its siblings. The extent then takes in those connectors' routes, and
	 * the embedded `.jis` source holds that same set, so dropping the image back on
	 * a canvas gives what pasting it would. An id inside another named group counts
	 * once, as part of that group.
	 */
	isolate?: boolean;
};

/**
 * Per-export options shared by the {@link CanvasExportHandle} methods.
 */
export type CanvasExportOptions = {
	/**
	 * What part of the world to export (see {@link CanvasExportRegion}).
	 * Defaults to `"content"`, which is what the export dialog does.
	 */
	region?: CanvasExportRegion;
	/**
	 * Margin (world px) kept around the content, on every side, replacing both the
	 * document's `view.padding` and the default (16). Only applies to the regions
	 * derived from objects (`"content"`, `{ ids }`); a region given as a rect or as
	 * the viewport is taken exactly.
	 */
	margin?: number;
	/**
	 * Whether to embed the `.jis` source in the image (default true),
	 * making the file re-editable. Without the source, the default download
	 * name drops the `.jis` marker (plain `.png` / `.svg`).
	 */
	includeSource?: boolean;
	/**
	 * Whether to skip the background fill (default false), producing an
	 * alpha-transparent image instead of the theme's canvas background.
	 */
	transparentBackground?: boolean;
};

/**
 * PNG-only additions to {@link CanvasExportOptions}: how many pixels the
 * rasterizer produces per logical px, and a cap on the result.
 */
export type CanvasPngExportOptions = CanvasExportOptions &
	Pick<RasterizeSvgOptions, "scale" | "maxPixelSize">;

/** No margin at all, for the regions given exactly (rect / viewport). */
const NO_MARGIN: ResolvedViewPadding = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
};

/** The same margin on all four sides, as an explicit `margin` option asks for. */
const uniformMargin = (margin: number): ResolvedViewPadding => ({
	top: margin,
	right: margin,
	bottom: margin,
	left: margin,
});

/** The bounds an export region resolves to, with the margin that still applies to it. */
type ResolvedExportRegion = {
	/** Null only for `"content"` on an empty canvas (an `{ ids }` region that draws nothing throws). */
	bounds: BoundingBox | null;
	/** The requested margin, or zero on every side for a region given exactly (rect / viewport). */
	margin: ResolvedViewPadding;
	/** The objects an isolated `{ ids }` region draws; undefined for every other region. */
	isolatedSubset: SelectionSubset | undefined;
};

/** The subset an isolated `{ ids }` region draws and embeds (see {@link CanvasExportIdsRegion.isolate}). */
const collectIsolatedSubset = (
	state: Pick<CanvasState, "objects" | "rootIds">,
	ids: readonly string[],
): SelectionSubset =>
	collectSelectionSubset(
		getTopLevelSelectedIds(
			ids.filter((id) => state.objects[id] !== undefined),
			state.objects,
		),
		state.objects,
		state.rootIds,
	);

/**
 * Resolves an `{ ids }` region. Throws when none of the ids draws anything, since
 * an image of something else (the current view) is not what was asked for.
 */
const resolveIdsRegion = (
	state: Pick<CanvasState, "objects" | "rootIds">,
	visualExtentRegistries: VisualExtentRegistries,
	region: CanvasExportIdsRegion,
	margin: ResolvedViewPadding,
): ResolvedExportRegion => {
	const isolatedSubset =
		region.isolate === true
			? collectIsolatedSubset(state, region.ids)
			: undefined;
	// An isolated subset's root ids carry the attached connectors, so a route
	// that leaves the named objects stays in the image
	const bounds = calcObjectsBoundingBox(
		isolatedSubset ? isolatedSubset.rootIds : region.ids,
		state.objects,
		visualExtentRegistries,
	);
	if (bounds === null) {
		throw new Error(
			`nothing to export at ids ${JSON.stringify(region.ids)}: none of them is on the canvas, or none of them draws anything`,
		);
	}
	return { bounds, margin, isolatedSubset };
};

/** Resolves a {@link CanvasExportRegion} against the state it is measured in. */
const resolveExportRegion = (
	state: Pick<CanvasState, "objects" | "rootIds"> & { viewport: Viewport },
	visualExtentRegistries: VisualExtentRegistries,
	region: CanvasExportRegion,
	margin: ResolvedViewPadding,
): ResolvedExportRegion => {
	if (region === "content") {
		return {
			bounds: calcContentBounds(state.objects, visualExtentRegistries),
			margin,
			isolatedSubset: undefined,
		};
	}
	if (region === "viewport") {
		return {
			bounds: convertRectToBoundingBox(calcVisibleWorldRect(state.viewport)),
			margin: NO_MARGIN,
			isolatedSubset: undefined,
		};
	}
	if ("ids" in region) {
		return resolveIdsRegion(state, visualExtentRegistries, region, margin);
	}
	return {
		bounds: convertRectToBoundingBox(region),
		margin: NO_MARGIN,
		isolatedSubset: undefined,
	};
};

/** What {@link resolveExportOptions} hands an export: how to build the image, and what to draw into it. */
export type ResolvedCanvasExport = {
	/** The source, background and viewBox the SVG is built with. */
	svgOptions: BuildExportSvgOptions;
	/**
	 * What the live SVG has to render while it is cloned: everything, or for an
	 * isolated `{ ids }` region the subset with the groups above it.
	 */
	renderScope: SnapshotRenderScope;
};

/** The embedded `.jis` source of an isolated export: the subset alone, under the document-wide fields. */
const isolatedSubsetToDoc = (
	state: CanvasState,
	objectMapper: ObjectMapperRegistry,
	isolatedSubset: SelectionSubset,
) => {
	const subsetObjects: CanvasState["objects"] = {};
	for (const id of isolatedSubset.objectIds) {
		subsetObjects[id] = state.objects[id];
	}
	// opaqueObjects are left out: their places are recorded against the whole
	// tree, and they are not drawn, so the image never showed them
	return canvasToDoc(
		{
			objects: subsetObjects,
			rootIds: isolatedSubset.rootIds,
			background: state.background,
			view: state.view,
		},
		objectMapper,
	);
};

/** The `.jis` source to embed: none, the subset an isolated region drew, or the whole document. */
const resolveEmbeddedSource = (
	state: CanvasState,
	objectMapper: ObjectMapperRegistry,
	includeSource: boolean,
	isolatedSubset: SelectionSubset | undefined,
): BuildExportSvgOptions["source"] => {
	if (!includeSource) {
		return undefined;
	}
	if (isolatedSubset) {
		return isolatedSubsetToDoc(state, objectMapper, isolatedSubset);
	}
	return canvasToDoc(state, objectMapper);
};

/**
 * Shared options of the SVG/PNG export: the .jis source and the viewBox the
 * region resolves to (by default the content bounds + margin), so the image is
 * independent of the current pan/zoom and window size. An empty canvas exported
 * as `"content"` falls back to the current view; an `{ ids }` region none of
 * whose ids draws anything throws.
 *
 * The margin comes from the first of these that is set: the caller's `margin`
 * (uniform), the document's `view.padding` (per side), the 16px default. So an
 * image gets the framing the document declared unless whoever asked for it named
 * a margin of their own.
 *
 * The single seam the two export entries share: the imperative handle
 * (`ref.current.export`) and the export dialog's submit both build their
 * `BuildExportSvgOptions` here, so an image is the same image however it was
 * asked for.
 *
 * @param state - The whole canvas state, plus the camera a `"viewport"` region is
 *   read from. Whole rather than the fields each step names, because the embedded
 *   `.jis` source is written from every document field it holds — a narrower type
 *   would drop what it left out (the background, the objects held as opaque)
 * @param objectMapper - Per-canvas ObjectMapperRegistry, used to serialize the
 *   embedded `.jis` source
 * @param visualExtentRegistries - Per-canvas registries measuring what is drawn
 *   (see calcObjectBoundingBox), so the viewBox takes in a shape's outside
 *   decoration and any connector route that leaves its owners
 * @param options - Region / margin / source embedding / background overrides
 * @returns The SVG build options, and the render scope the export has to clone
 *   the live SVG under (see useSnapshotRenderScope)
 */
export const resolveExportOptions = (
	state: CanvasState & { viewport: Viewport },
	objectMapper: ObjectMapperRegistry,
	visualExtentRegistries: VisualExtentRegistries,
	{
		region = "content",
		margin,
		includeSource = true,
		transparentBackground = false,
	}: CanvasExportOptions = {},
): ResolvedCanvasExport => {
	const requestedMargin =
		margin !== undefined
			? uniformMargin(margin)
			: state.view?.padding !== undefined
				? resolveViewPadding(state.view.padding)
				: uniformMargin(EXPORT_FIT_PADDING);
	const resolved = resolveExportRegion(
		state,
		visualExtentRegistries,
		region,
		requestedMargin,
	);
	const bounds = resolved.bounds;
	const appliedMargin = resolved.margin;
	// Content that is only a horizontal or vertical line degenerates to zero width or height,
	// and with margin 0 the viewBox would collapse and export an empty image. Guarantee at
	// least 1 world px, centering the content in the band it gains.
	const rawWidth = bounds
		? bounds.right - bounds.left + appliedMargin.left + appliedMargin.right
		: 0;
	const rawHeight = bounds
		? bounds.bottom - bounds.top + appliedMargin.top + appliedMargin.bottom
		: 0;
	const width = Math.max(rawWidth, 1);
	const height = Math.max(rawHeight, 1);
	const isolatedSubset = resolved.isolatedSubset;
	return {
		svgOptions: {
			source: resolveEmbeddedSource(
				state,
				objectMapper,
				includeSource,
				isolatedSubset,
			),
			// "transparent" skips the background rect (buildExportSvg);
			// undefined falls back to the live theme background
			background: transparentBackground ? "transparent" : undefined,
			viewBox: bounds
				? {
						x: bounds.left - appliedMargin.left - (width - rawWidth) / 2,
						y: bounds.top - appliedMargin.top - (height - rawHeight) / 2,
						width,
						height,
					}
				: undefined,
		},
		renderScope: isolatedSubset
			? buildIdsWithAncestors(isolatedSubset.objectIds, state.objects)
			: "all",
	};
};
