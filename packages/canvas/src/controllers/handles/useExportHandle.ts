import type { Rect } from "@jiscribe/geometry";
import { type RefObject, useCallback, useMemo } from "react";

import { useCanvasStateMirror } from "./useCanvasStateMirror";
import { useLatestRef } from "../../foundation/hooks/useLatestRef";
import { canvasToSvgString, rasterizeSvgToPng } from "../../rendering/export";
import type { ResolveImageBlob } from "../../rendering/export";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasRegistries } from "../registries";
import { calcVisibleWorldRect } from "../utils/calcVisibleWorldRect";
import {
	resolveExportOptions,
	type CanvasExportOptions,
	type CanvasPngExportOptions,
} from "../utils/resolveExportOptions";
import type { SnapshotRenderScope } from "../utils/SnapshotRenderScope";

/**
 * Imperative export API exposed on the `export` namespace of the Canvas handle
 * (`ref.current.export`). Hosts that need image bytes programmatically (e.g. the
 * VSCode extension re-rendering a `.jis.png` / `.jis.svg` on save) use this to
 * run the exact same export pipeline as the export dialog, which is what it does
 * with nothing passed: fit to content, source embedded. `region` is where the two
 * part ways — the dialog exports the whole diagram or the selection alone, while
 * a caller can take any part of it (see {@link CanvasExportOptions.region}).
 */
export type CanvasExportHandle = {
	/**
	 * Builds the self-contained editable SVG string (`.jis.svg` content).
	 *
	 * The live tree is cloned synchronously, before the first await, so the
	 * culling replacement is over by the time the promise is returned; only the
	 * `<image>` bytes are read after that.
	 *
	 * @param options - Region / source embedding / background (see {@link CanvasExportOptions}); nothing passed is what the export dialog does — fit to content, source embedded
	 * @returns The serialized SVG, or null when the canvas is not mounted yet.
	 *   Rejects when an `{ ids }` region names nothing that draws
	 */
	toSvgString(options?: CanvasExportOptions): Promise<string | null>;
	/**
	 * Rasterizes the canvas to a PNG with the `.jis` source embedded as an
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
	 *   is not mounted yet. Rejects when an `{ ids }` region names nothing that
	 *   draws
	 */
	capturePng(
		options?: CanvasPngExportOptions,
	): Promise<CanvasPngCapture | null>;
};

/** An exported PNG together with the part of the world it shows. */
export type CanvasPngCapture = {
	/** The encoded PNG (with the `.jis` source embedded unless turned off). */
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
 * @param withSnapshotRenderScope - Runs the snapshot with the viewport culling
 *   gate replaced, so the clone sees every object rather than the on-screen ones
 *   — or, for an isolated region, exactly the ones it draws (see useSnapshotRenderScope)
 * @param resolveImageBlob - Reads the bytes an exported `<image>` carries;
 *   mirrored in a ref, so it may be a new function on every render (it changes
 *   identity as files arrive) without the handle losing its own
 */
export const useExportHandle = (
	canvasState: CanvasControllerState,
	registries: CanvasRegistries,
	svgRef: RefObject<SVGSVGElement | null>,
	withSnapshotRenderScope: <T>(
		renderScope: SnapshotRenderScope,
		snapshot: () => T,
	) => T,
	resolveImageBlob: ResolveImageBlob,
): CanvasExportHandle => {
	const canvasStateRef = useCanvasStateMirror(canvasState);

	// Read at export time, so a file arriving does not rebuild the handle a host
	// may be holding on to.
	const resolveImageBlobRef = useLatestRef(resolveImageBlob);

	// registries is fixed at mount (see the `initialConfig` prop doc), so this
	// callback — and the handle built on it — is stable for the canvas lifetime.
	const buildExportOptions = useCallback(
		(options?: CanvasExportOptions) => {
			const { svgOptions, renderScope } = resolveExportOptions(
				canvasStateRef.current,
				registries.objectMapper,
				registries,
				options,
			);
			return {
				svgOptions: {
					...svgOptions,
					resolveImageBlob: (src: string) => resolveImageBlobRef.current(src),
				},
				renderScope,
			};
		},
		[canvasStateRef, resolveImageBlobRef, registries],
	);

	return useMemo(
		() => ({
			toSvgString: async (options?: CanvasExportOptions) => {
				const svg = svgRef.current;
				if (!svg) {
					return null;
				}
				const { svgOptions, renderScope } = buildExportOptions(options);
				// The replacement only spans a synchronous callback, which is enough:
				// canvasToSvgString clones the live tree before its first await.
				return await withSnapshotRenderScope(renderScope, () =>
					canvasToSvgString(svg, svgOptions),
				);
			},

			capturePng: async (options?: CanvasPngExportOptions) => {
				const svg = svgRef.current;
				if (!svg) {
					return null;
				}
				const { svgOptions, renderScope } = buildExportOptions(options);
				const rasterized = await withSnapshotRenderScope(renderScope, () =>
					rasterizeSvgToPng(svg, {
						...svgOptions,
						scale: options?.scale,
						maxPixelSize: options?.maxPixelSize,
					}),
				);
				return {
					blob: rasterized.blob,
					// No viewBox means an empty canvas exported as "content": the live
					// view was exported as-is, which is the visible world rect.
					region:
						svgOptions.viewBox ??
						calcVisibleWorldRect(canvasStateRef.current.viewport),
					pixelWidth: rasterized.width,
					pixelHeight: rasterized.height,
				};
			},
		}),
		[canvasStateRef, svgRef, buildExportOptions, withSnapshotRenderScope],
	);
};
