import type { ResolvedViewPadding } from "@jiscribe/doc/model/canvas/ViewDoc";
import { resolveViewPadding } from "@jiscribe/doc/model/canvas/ViewDoc";
import { convertRectToBoundingBox } from "@jiscribe/geometry";
import type { BoundingBox, Rect } from "@jiscribe/geometry";

import { calcContentBounds } from "./calcContentBounds";
import { calcObjectsBoundingBox } from "./calcObjectBoundingBox";
import { calcVisibleWorldRect } from "./calcVisibleWorldRect";
import type { BuildExportSvgOptions, RasterizeSvgOptions } from "../../export";
import type { ObjectVisualBoundsRegistry } from "../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import { canvasToDoc } from "../../states/canvas/CanvasMapper";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";

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
 * Every value crops rather than filters: whatever is drawn inside the region is
 * exported, including the parts of shapes that only reach into it. Nothing is
 * hidden to isolate a subject.
 *
 * - `"content"` (the default): everything on the canvas, `margin` around it.
 * - `"viewport"`: exactly what the view shows right now, `margin` ignored.
 * - `{ ids }`: the extent of those objects, `margin` around it — the way to get
 *   one corner of a large diagram at a resolution worth looking at.
 * - a `Rect`: that world rect exactly, `margin` ignored.
 */
export type CanvasExportRegion =
	"content" | "viewport" | { ids: readonly string[] } | Rect;

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
	 * Whether to embed the `.jis.json` source in the image (default true),
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
	/** Null only for an object-derived region that matched nothing to measure. */
	bounds: BoundingBox | null;
	/** The requested margin, or zero on every side for a region given exactly (rect / viewport). */
	margin: ResolvedViewPadding;
};

/** Resolves a {@link CanvasExportRegion} against the state it is measured in. */
const resolveExportRegion = (
	state: Pick<CanvasState, "objects" | "viewport">,
	visualBounds: Pick<ObjectVisualBoundsRegistry, "get"> | null | undefined,
	region: CanvasExportRegion,
	margin: ResolvedViewPadding,
): ResolvedExportRegion => {
	if (region === "content") {
		return { bounds: calcContentBounds(state.objects, visualBounds), margin };
	}
	if (region === "viewport") {
		return {
			bounds: convertRectToBoundingBox(calcVisibleWorldRect(state.viewport)),
			margin: NO_MARGIN,
		};
	}
	if ("ids" in region) {
		return {
			bounds: calcObjectsBoundingBox(region.ids, state.objects, visualBounds),
			margin,
		};
	}
	return { bounds: convertRectToBoundingBox(region), margin: NO_MARGIN };
};

/**
 * Shared options of the SVG/PNG export: the .jis.json source and the viewBox the
 * region resolves to (by default the content bounds + margin), so the image is
 * independent of the current pan/zoom and window size. A region with nothing to
 * measure — an empty canvas, ids that are all missing — falls back to exporting
 * the current view.
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
 * @param state - The objects to export, their z-order, the camera a `"viewport"`
 *   region is read from, and the `view` whose padding frames a content region
 * @param objectMapper - Per-canvas ObjectMapperRegistry, used to serialize the
 *   embedded `.jis.json` source
 * @param visualBounds - Per-canvas ObjectVisualBoundsRegistry; without it the
 *   viewBox is fitted to the geometry boxes and the default 16px margin is all
 *   that keeps a shape's outside decoration from being cropped
 * @param options - Region / margin / source embedding / background overrides
 */
export const resolveExportOptions = (
	state: Pick<CanvasState, "objects" | "rootIds" | "viewport" | "view">,
	objectMapper: ObjectMapperRegistry,
	visualBounds?: Pick<ObjectVisualBoundsRegistry, "get"> | null,
	{
		region = "content",
		margin,
		includeSource = true,
		transparentBackground = false,
	}: CanvasExportOptions = {},
): BuildExportSvgOptions => {
	const requestedMargin =
		margin !== undefined
			? uniformMargin(margin)
			: state.view?.padding !== undefined
				? resolveViewPadding(state.view.padding)
				: uniformMargin(EXPORT_FIT_PADDING);
	const resolved = resolveExportRegion(
		state,
		visualBounds,
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
	return {
		source: includeSource ? canvasToDoc(state, objectMapper) : undefined,
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
	};
};
