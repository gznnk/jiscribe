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
 * Default margin (world px) kept around the content in exported images. Also
 * absorbs extents the content bounds do not account for (stroke widths, arrow
 * heads). The export dialog and {@link CanvasExportOptions} can override it.
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
	 * Margin (world px) kept around the content, replacing the default (16).
	 * Only applies to the regions derived from objects (`"content"`, `{ ids }`);
	 * a region given as a rect or as the viewport is taken exactly.
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

/** The bounds an export region resolves to, with the margin that still applies to it. */
type ResolvedExportRegion = {
	/** Null only for an object-derived region that matched nothing to measure. */
	bounds: BoundingBox | null;
	/** The requested margin, or 0 for a region given exactly (rect / viewport). */
	margin: number;
};

/** Resolves a {@link CanvasExportRegion} against the state it is measured in. */
const resolveExportRegion = (
	state: Pick<CanvasState, "objects" | "viewport">,
	visualBounds: Pick<ObjectVisualBoundsRegistry, "get"> | null | undefined,
	region: CanvasExportRegion,
	margin: number,
): ResolvedExportRegion => {
	if (region === "content") {
		return { bounds: calcContentBounds(state.objects, visualBounds), margin };
	}
	if (region === "viewport") {
		return {
			bounds: convertRectToBoundingBox(calcVisibleWorldRect(state.viewport)),
			margin: 0,
		};
	}
	if ("ids" in region) {
		return {
			bounds: calcObjectsBoundingBox(region.ids, state.objects, visualBounds),
			margin,
		};
	}
	return { bounds: convertRectToBoundingBox(region), margin: 0 };
};

/**
 * Shared options of the SVG/PNG export: the .jis.json source and the viewBox the
 * region resolves to (by default the content bounds + margin), so the image is
 * independent of the current pan/zoom and window size. A region with nothing to
 * measure — an empty canvas, ids that are all missing — falls back to exporting
 * the current view.
 *
 * The single seam the two export entries share: the imperative handle
 * (`ref.current.export`) and the export dialog's submit both build their
 * `BuildExportSvgOptions` here, so an image is the same image however it was
 * asked for.
 *
 * @param state - The objects to export, their z-order, and the camera a
 *   `"viewport"` region is read from
 * @param objectMapper - Per-canvas ObjectMapperRegistry, used to serialize the
 *   embedded `.jis.json` source
 * @param visualBounds - Per-canvas ObjectVisualBoundsRegistry; without it the
 *   viewBox is fitted to the geometry boxes and the default 16px margin is all
 *   that keeps a shape's outside decoration from being cropped
 * @param options - Region / margin / source embedding / background overrides
 */
export const resolveExportOptions = (
	state: Pick<CanvasState, "objects" | "rootIds" | "viewport">,
	objectMapper: ObjectMapperRegistry,
	visualBounds?: Pick<ObjectVisualBoundsRegistry, "get"> | null,
	{
		region = "content",
		margin = EXPORT_FIT_PADDING,
		includeSource = true,
		transparentBackground = false,
	}: CanvasExportOptions = {},
): BuildExportSvgOptions => {
	const resolved = resolveExportRegion(state, visualBounds, region, margin);
	const bounds = resolved.bounds;
	const appliedMargin = resolved.margin;
	// Content that is only a horizontal or vertical line degenerates to zero width or height,
	// and with margin 0 the viewBox would collapse and export an empty image. Guarantee at
	// least 1 world px, centering the content in the band it gains.
	const rawWidth = bounds ? bounds.right - bounds.left + appliedMargin * 2 : 0;
	const rawHeight = bounds ? bounds.bottom - bounds.top + appliedMargin * 2 : 0;
	const width = Math.max(rawWidth, 1);
	const height = Math.max(rawHeight, 1);
	return {
		source: includeSource ? canvasToDoc(state, objectMapper) : undefined,
		// "transparent" skips the background rect (buildExportSvg);
		// undefined falls back to the live theme background
		background: transparentBackground ? "transparent" : undefined,
		viewBox: bounds
			? {
					x: bounds.left - appliedMargin - (width - rawWidth) / 2,
					y: bounds.top - appliedMargin - (height - rawHeight) / 2,
					width,
					height,
				}
			: undefined,
	};
};
