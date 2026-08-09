import {
	buildSizedExportSvgString,
	type BuildExportSvgOptions,
} from "./buildExportSvg";
import { buildTimestampedName, downloadBlob } from "./downloadBlob";
import { embedCanvasSourceInPng } from "./pngCanvasSource";

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
 * Loads an SVG string into an `<img>`. A Blob URL is used instead of a data
 * URL so large diagrams do not hit URL length limits or pay encoding cost.
 */
const loadSvgImage = (svgXml: string): Promise<HTMLImageElement> => {
	const blob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load SVG image for PNG export"));
		};
		image.src = url;
	});
};

/**
 * Rasterizes the Canvas `<svg>` into a PNG Blob.
 *
 * The export SVG being drawn has its text already converted to native
 * `<text>`, so no foreignObject-induced canvas taint occurs. When
 * `options.source` is given, the `.jis.json` is embedded as an `iTXt`
 * chunk so the PNG can be reopened for editing (draw.io-style round-trip).
 */
export const rasterizeSvgToPngBlob = async (
	svg: SVGSVGElement,
	options: RasterizeSvgOptions = {},
): Promise<Blob> => {
	const { svgXml, width, height } = buildSizedExportSvgString(svg, options);
	const scale = resolveScale(options, width, height);
	const image = await loadSvgImage(svgXml);

	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.ceil(width * scale));
	canvas.height = Math.max(1, Math.ceil(height * scale));

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Failed to acquire 2D context for PNG export");
	}
	context.drawImage(image, 0, 0, canvas.width, canvas.height);

	const encoded = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
			} else {
				reject(new Error("Failed to encode canvas to PNG blob"));
			}
		}, "image/png");
	});

	return options.source
		? embedCanvasSourceInPng(encoded, options.source)
		: encoded;
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
	const blob = await rasterizeSvgToPngBlob(svg, options);
	const extension = options.source ? ".jis.png" : ".png";
	downloadBlob(
		blob,
		options.fileName ?? `${buildTimestampedName()}${extension}`,
	);
};
