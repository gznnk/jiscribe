import { embedCanvasSourceInPng } from "@jiscribe/doc/file/pngCanvasSource";

import {
	buildSizedExportSvgWithHtmlOverlays,
	inlineExportImages,
	replaceKeptHtmlOverlaysWithText,
	serializeSvg,
	type BuildExportSvgOptions,
} from "./buildExportSvg";
import { buildTimestampedName, downloadBlob } from "./downloadBlob";
import { embedLoadedFontFaces } from "./embedFontFaces";

export type RasterizeSvgOptions = BuildExportSvgOptions & {
	/**
	 * Output pixel scale factor. Defaults to 2 for Retina-level sharpness.
	 * The output pixels are the SVG's logical size × scale.
	 */
	scale?: number;
	/**
	 * Cap on the longest output edge in px, for callers that must bound the
	 * encoded size (e.g. an image handed to an AI agent). Lowers `scale` when
	 * it would exceed the cap; a smaller image is never scaled up to reach it.
	 */
	maxPixelSize?: number;
};

/** Applies {@link RasterizeSvgOptions.maxPixelSize} to the requested scale. */
const resolveScale = (
	{ scale = 2, maxPixelSize }: RasterizeSvgOptions,
	width: number,
	height: number,
): number => {
	const longestEdge = Math.max(width, height);
	if (maxPixelSize === undefined || longestEdge <= 0) {
		return scale;
	}
	return Math.min(scale, maxPixelSize / longestEdge);
};

/**
 * Loads an SVG string into an `<img>`. An SVG holding HTML goes through a data
 * URL: through a blob URL its foreignObject taints the canvas it is drawn on,
 * and the encode throws, while a data URL does not taint it (a 6MB one loads in
 * about 110ms). Any other SVG goes through a blob URL, which spares the
 * encoding and asks the host's CSP for `img-src blob:` alone.
 */
const loadSvgImage = (
	svgXml: string,
	isHtmlKept: boolean,
): Promise<HTMLImageElement> => {
	const blobUrl = isHtmlKept
		? null
		: URL.createObjectURL(
				new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" }),
			);
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			if (blobUrl !== null) {
				URL.revokeObjectURL(blobUrl);
			}
			resolve(image);
		};
		image.onerror = () => {
			if (blobUrl !== null) {
				URL.revokeObjectURL(blobUrl);
			}
			reject(new Error("Failed to load SVG image for PNG export"));
		};
		image.src =
			blobUrl ??
			`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgXml)}`;
	});
};

/** Draws a finished export SVG onto a new canvas of the given pixel size. */
const drawExportSvg = async (
	exportSvg: SVGSVGElement,
	isHtmlKept: boolean,
	pixelWidth: number,
	pixelHeight: number,
): Promise<HTMLCanvasElement> => {
	const image = await loadSvgImage(serializeSvg(exportSvg), isHtmlKept);

	const canvas = document.createElement("canvas");
	canvas.width = pixelWidth;
	canvas.height = pixelHeight;
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Failed to acquire 2D context for PNG export");
	}
	context.drawImage(image, 0, 0, canvas.width, canvas.height);
	return canvas;
};

/** Encodes a canvas as PNG; rejects with `SecurityError` when the canvas is tainted. */
const encodeCanvasToPng = (canvas: HTMLCanvasElement): Promise<Blob> =>
	new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
			} else {
				reject(new Error("Failed to encode canvas to PNG blob"));
			}
		}, "image/png");
	});

const isSecurityError = (error: unknown): boolean =>
	error instanceof DOMException && error.name === "SecurityError";

/** A rasterized canvas image: the encoded bytes and the pixel grid they were drawn on. */
export type RasterizedPng = {
	/** The encoded PNG. */
	blob: Blob;
	/** Output width in px, after `scale` and any `maxPixelSize` cap. */
	width: number;
	/** Output height in px, under the same scaling as `width`. */
	height: number;
};

/**
 * Rasterizes the Canvas `<svg>` into a PNG, reporting the pixel size it came
 * out at — which `scale` and `maxPixelSize` decide together, so a caller
 * mapping image pixels back onto the exported region cannot derive it up front.
 *
 * Text overlays marked `data-canvas-export="html"` (Markdown) are drawn as the
 * rendered HTML, with their computed styles baked in (see
 * bakeHtmlOverlayStyles); every other text is drawn as native `<text>`. An SVG
 * holding such HTML goes to the `<img>` as a data URL, so with Markdown on the
 * canvas the host's CSP has to allow `img-src data:`; without it, a blob URL
 * (`img-src blob:`) as before. Should a browser taint the canvas over the kept
 * HTML anyway, the overlays are swapped for the `<text>` the SVG export writes,
 * the image is drawn once more, and a `console.warn` says how many were.
 *
 * Its faces are embedded into this copy alone (see {@link embedLoadedFontFaces})
 * — the file the SVG export writes stays free of them. The image bytes are read
 * alongside them: both are what the synchronous clone could not carry. When
 * `options.source` is given, the `.jis` is embedded as an `iTXt` chunk so the
 * PNG can be reopened for editing (draw.io-style round-trip).
 *
 * @param svg - The live canvas `<svg>` to snapshot
 * @param options - Region / source embedding / background, plus the pixel scale
 *   and its cap (see {@link RasterizeSvgOptions})
 * @returns The encoded PNG and its pixel dimensions
 */
export const rasterizeSvgToPng = async (
	svg: SVGSVGElement,
	options: RasterizeSvgOptions = {},
): Promise<RasterizedPng> => {
	const { exportSvg, keptHtmlOverlays, width, height } =
		buildSizedExportSvgWithHtmlOverlays(svg, options, "keep");
	const scale = resolveScale(options, width, height);
	const pixelWidth = Math.max(1, Math.ceil(width * scale));
	const pixelHeight = Math.max(1, Math.ceil(height * scale));
	await inlineExportImages(exportSvg, options.resolveImageBlob);
	await embedLoadedFontFaces(exportSvg);

	const isHtmlKept = keptHtmlOverlays.length > 0;
	let encoded: Blob;
	try {
		encoded = await encodeCanvasToPng(
			await drawExportSvg(exportSvg, isHtmlKept, pixelWidth, pixelHeight),
		);
	} catch (error) {
		if (!isHtmlKept || !isSecurityError(error)) {
			throw error;
		}
		// Verified untainted on Chromium and Firefox only; WebKit is untested.
		console.warn(
			`PNG export: the canvas was tainted, so ${keptHtmlOverlays.length} HTML overlay(s) (Markdown) were drawn as plain text`,
		);
		replaceKeptHtmlOverlaysWithText(keptHtmlOverlays);
		encoded = await encodeCanvasToPng(
			await drawExportSvg(exportSvg, false, pixelWidth, pixelHeight),
		);
	}

	return {
		blob: options.source
			? await embedCanvasSourceInPng(encoded, options.source)
			: encoded,
		width: pixelWidth,
		height: pixelHeight,
	};
};

export type ExportCanvasToPngOptions = RasterizeSvgOptions & {
	/**
	 * Download file name. Defaults to a timestamped name — `.jis.png` when a
	 * source is embedded (the `.jis` marker means "re-editable"), plain `.png`
	 * otherwise.
	 */
	fileName?: string;
};

/**
 * Rasterizes the Canvas `<svg>` to PNG and downloads it. The `.jis.png`
 * double extension marks the file as carrying an embedded jiscribe source
 * (like draw.io's `.drawio.png`), so hosts such as the VSCode extension can
 * bind their canvas editor to that filename pattern; a source-less export
 * gets a plain `.png` name instead.
 */
export const exportCanvasToPng = async (
	svg: SVGSVGElement,
	options: ExportCanvasToPngOptions = {},
): Promise<void> => {
	const { blob } = await rasterizeSvgToPng(svg, options);
	const extension = options.source ? ".jis.png" : ".png";
	downloadBlob(
		blob,
		options.fileName ?? `${buildTimestampedName()}${extension}`,
	);
};
