import {
	buildExportSvg,
	getSvgSize,
	serializeSvg,
	type BuildExportSvgOptions,
} from "./buildExportSvg";
import { buildTimestampedName, downloadBlob } from "./downloadBlob";

export type ExportCanvasToSvgOptions = BuildExportSvgOptions & {
	/** Download file name. Defaults to a timestamped name (extension .jis.svg). */
	fileName?: string;
};

/**
 * Converts the Canvas `<svg>` to a self-contained SVG string displayable in
 * any environment. When `source` is given, the `.jis.json` is embedded in
 * `<metadata>` so the file remains re-editable.
 */
export const canvasToSvgString = (
	svg: SVGSVGElement,
	options: BuildExportSvgOptions = {},
): string => {
	// With a fit-to-content viewBox the logical size is the region itself
	// (1 world unit = 1 CSS px); otherwise export at the on-screen size.
	const { width, height } = options.viewBox ?? getSvgSize(svg);
	const exportSvg = buildExportSvg(svg, options);
	exportSvg.setAttribute("width", String(width));
	exportSvg.setAttribute("height", String(height));
	return serializeSvg(exportSvg);
};

/**
 * Downloads the Canvas `<svg>` as an editable SVG (`.jis.svg`).
 * The equivalent of draw.io's editable SVG: native SVG visuals with the
 * editing source stored in metadata.
 */
export const exportCanvasToSvg = (
	svg: SVGSVGElement,
	options: ExportCanvasToSvgOptions = {},
): void => {
	const svgString = canvasToSvgString(svg, options);
	const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
	downloadBlob(blob, options.fileName ?? `${buildTimestampedName()}.jis.svg`);
};
