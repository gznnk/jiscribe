import type { Rect } from "@jiscribe/geometry";
import { type RefObject, useCallback, useMemo } from "react";

import { useCanvasStateMirror } from "./useCanvasStateMirror";
import { canvasToSvgString, rasterizeSvgToPng } from "../../export";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasRegistries } from "../registries";
import { calcVisibleWorldRect } from "../utils/calcVisibleWorldRect";
import {
	resolveExportOptions,
	type CanvasExportOptions,
	type CanvasPngExportOptions,
} from "../utils/resolveExportOptions";

/**
 * Imperative export API exposed on the `export` namespace of the Canvas handle
 * (`ref.current.export`). Hosts that need image bytes programmatically (e.g. the
 * VSCode extension re-rendering a `.jis.png` / `.jis.svg` on save) use this to
 * run the exact same export pipeline as the export dialog, which is what it does
 * with nothing passed: fit to content, source embedded. `region` is where the two
 * part ways — the dialog always exports the whole diagram, while a caller can
 * take one part of it (see {@link CanvasExportOptions.region}).
 */
export type CanvasExportHandle = {
	/**
	 * Builds the self-contained editable SVG string (`.jis.svg` content).
	 * Returns null when the canvas is not mounted yet.
	 */
	toSvgString(options?: CanvasExportOptions): string | null;
	/**
	 * Rasterizes the canvas to a PNG with the `.jis.json` source embedded as an
	 * iTXt chunk, and with the image's own frame of reference attached
	 * (see {@link CanvasPngCapture}).
	 *
	 * The frame of reference is why this is a capture where the SVG side is a
	 * plain string: a raster keeps no coordinates of its own, so bytes alone
	 * could not say what part of the world they show. That is what turns a
	 * position found in the image back into a canvas coordinate — and from
	 * there, through `measure.hitTest`, into the objects that are there. A
	 * caller that only wants the file takes `.blob` off the result.
	 *
	 * @param options - Region, scale and the rest (see {@link CanvasPngExportOptions});
	 *   `region: { ids }` with a `maxPixelSize` is the pairing that gets one part
	 *   of a large diagram legible
	 * @returns The image with its region and pixel size, or null when the canvas
	 *   is not mounted yet
	 */
	capturePng(
		options?: CanvasPngExportOptions,
	): Promise<CanvasPngCapture | null>;
};

/** An exported PNG together with the part of the world it shows. */
export type CanvasPngCapture = {
	/** The encoded PNG (with the `.jis.json` source embedded unless turned off). */
	blob: Blob;
	/**
	 * The world rect the image covers, margin included. It is mapped onto the
	 * image edge to edge, so a position in the image is
	 * `region.x + (imageX / pixelWidth) * region.width` in world coordinates (and
	 * the same in y) — no other export setting enters into it.
	 */
	region: Rect;
	/** Width of the image in px, after the scale and any `maxPixelSize` cap. */
	pixelWidth: number;
	/** Height of the image in px, under the same scaling as {@link pixelWidth}. */
	pixelHeight: number;
};

/**
 * Builds the stable export sub-handle assembled into the Canvas handle.
 *
 * @param canvasState - Current controller state, read at export time (not at
 *   render time) so the handle stays referentially stable
 * @param registries - The canvas's registry bundle; its mapper serializes the
 *   embedded source and its visual bounds decide how much of what a shape draws
 *   outside its geometry box the fitted region keeps
 * @param svgRef - Ref to the canvas's `<svg>`; every method clones it, and they
 *   all return null while it is null (before the view mounts)
 * @param withCullingSuspended - Runs the snapshot with viewport culling
 *   suspended, so the clone sees every object rather than the on-screen ones
 *   (see useViewportCulling)
 */
export const useExportHandle = (
	canvasState: CanvasControllerState,
	registries: CanvasRegistries,
	svgRef: RefObject<SVGSVGElement | null>,
	withCullingSuspended: <T>(snapshot: () => T) => T,
): CanvasExportHandle => {
	const canvasStateRef = useCanvasStateMirror(canvasState);

	// registries is fixed at mount (see the `initialConfig` prop doc), so this
	// callback — and the handle built on it — is stable for the canvas lifetime.
	const buildExportOptions = useCallback(
		(options?: CanvasExportOptions) =>
			resolveExportOptions(
				canvasStateRef.current,
				registries.objectMapper,
				registries.objectVisualBounds,
				options,
			),
		[canvasStateRef, registries],
	);

	return useMemo(
		() => ({
			toSvgString: (options?: CanvasExportOptions) => {
				const svg = svgRef.current;
				return svg
					? withCullingSuspended(() =>
							canvasToSvgString(svg, buildExportOptions(options)),
						)
					: null;
			},

			capturePng: async (options?: CanvasPngExportOptions) => {
				const svg = svgRef.current;
				if (!svg) {
					return null;
				}
				const exportOptions = buildExportOptions(options);
				const rasterized = await withCullingSuspended(() =>
					rasterizeSvgToPng(svg, {
						...exportOptions,
						scale: options?.scale,
						maxPixelSize: options?.maxPixelSize,
					}),
				);
				return {
					blob: rasterized.blob,
					// No viewBox means the region had nothing to measure and the live
					// view was exported as-is, which is the visible world rect.
					region:
						exportOptions.viewBox ??
						calcVisibleWorldRect(canvasStateRef.current.viewport),
					pixelWidth: rasterized.width,
					pixelHeight: rasterized.height,
				};
			},
		}),
		[canvasStateRef, svgRef, buildExportOptions, withCullingSuspended],
	);
};
