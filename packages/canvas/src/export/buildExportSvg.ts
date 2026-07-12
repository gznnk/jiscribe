import type { Rect } from "@workspace/geometry";

import { embedCanvasSource } from "./canvasSourceMetadata";
import { foreignObjectToSvgText } from "./foreignObjectToSvgText";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";

const SVG_NS = "http://www.w3.org/2000/svg";

export type BuildExportSvgOptions = {
	/** Editing source (`.jis.json`) to embed. Omit to skip the metadata. */
	source?: CanvasDoc;
	/**
	 * Background color. When omitted, the live SVG's computed
	 * `background-color` is used. Pass `"transparent"` to skip the
	 * background rect entirely.
	 */
	background?: string;
	/**
	 * Region to export, in world coordinates (e.g. fit-to-content bounds).
	 * It becomes both the viewBox and the logical output size, making the
	 * image independent of the current pan/zoom and window size. When
	 * omitted, the live viewBox (the current view) is exported as-is.
	 */
	viewBox?: Rect;
};

/** Creates a single Canvas 2D context used for text measurement. */
const createMeasureContext = (): CanvasRenderingContext2D => {
	const context = document.createElement("canvas").getContext("2d");
	if (!context) {
		throw new Error("Failed to acquire 2D context for text measurement");
	}
	return context;
};

/**
 * Rendering properties baked from the live computed style into the clone.
 *
 * Shape paint is applied via emotion classes and theme CSS custom properties
 * (`var(--jiscribe-*)` on the Canvas root — issue #38 / doc 08), neither of
 * which survives outside the document: serialized SVG loses the class rules,
 * and a detached tree cannot resolve the custom properties, so `fill` falls
 * back to its initial value (black). Baking the computed values makes the
 * export self-contained.
 */
const BAKED_STYLE_PROPERTIES = [
	"fill",
	"fill-opacity",
	"fill-rule",
	"stroke",
	"stroke-width",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-miterlimit",
	"stroke-opacity",
	"opacity",
	// currentColor references (e.g. in markers) resolve through this
	"color",
] as const;

/**
 * Bakes the rendering-relevant computed styles of every SVG element into
 * inline styles on its cloned counterpart (paired by tree order), and drops
 * the class attributes that are meaningless outside the document.
 * HTML content inside foreignObject is skipped — it is converted to native
 * `<text>` (with its own computed-style reads) afterwards.
 */
const bakeComputedStyles = (
	liveSvg: SVGSVGElement,
	clonedSvg: SVGSVGElement,
): void => {
	const liveElements = liveSvg.querySelectorAll("*");
	const clonedElements = clonedSvg.querySelectorAll("*");
	for (let i = 0; i < clonedElements.length; i++) {
		const cloned = clonedElements[i];
		const live = liveElements[i];
		if (!live || !(cloned instanceof SVGElement)) {
			continue;
		}
		if (cloned.closest("foreignObject")) {
			continue;
		}
		const computed = getComputedStyle(live);
		for (const property of BAKED_STYLE_PROPERTIES) {
			const value = computed.getPropertyValue(property);
			if (value !== "") {
				cloned.style.setProperty(property, value);
			}
		}
		cloned.removeAttribute("class");
	}
};

/** Returns the logical size (CSS pixels) of the SVG. */
export const getSvgSize = (
	svg: SVGSVGElement,
): { width: number; height: number } => {
	const width = svg.width.baseVal.value;
	const height = svg.height.baseVal.value;
	if (width > 0 && height > 0) {
		return { width, height };
	}
	const rect = svg.getBoundingClientRect();
	return { width: rect.width, height: rect.height };
};

/**
 * Builds a self-contained export SVG from the live Canvas `<svg>` that can be
 * displayed and rasterized in any environment.
 *
 * - Bakes computed paint styles (fill / stroke / opacity) into inline styles
 *   — emotion classes and `var(--jiscribe-*)` do not survive standalone
 * - Removes control overlays (selection handles, ...) and the grid
 * - Converts foreignObject text to native `<text>` (avoids canvas taint and
 *   works on GitHub, which sanitizes foreignObject away)
 * - Lays a solid background `<rect>`
 * - When `source` is given, embeds the `.jis.json` in `<metadata>`
 */
export const buildExportSvg = (
	svg: SVGSVGElement,
	options: BuildExportSvgOptions = {},
): SVGSVGElement => {
	const cloned = svg.cloneNode(true) as SVGSVGElement;

	// Override the exported region before anything reads cloned.viewBox
	// (the background rect below covers whatever the final viewBox is).
	if (options.viewBox) {
		const { x, y, width, height } = options.viewBox;
		cloned.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
	}

	// Bake paint styles first, while the clone still mirrors the live tree
	// one-to-one (later steps mutate the clone's structure).
	bakeComputedStyles(svg, cloned);

	// foreignObject → <text> conversion (live and cloned nodes correspond by order)
	const measureContext = createMeasureContext();
	const liveForeignObjects = svg.querySelectorAll("foreignObject");
	const clonedForeignObjects = cloned.querySelectorAll("foreignObject");
	for (let i = 0; i < clonedForeignObjects.length; i++) {
		const clonedForeignObject = clonedForeignObjects[i];
		const liveForeignObject = liveForeignObjects[i];
		const replacement = liveForeignObject
			? foreignObjectToSvgText(
					liveForeignObject,
					clonedForeignObject,
					measureContext,
				)
			: null;
		if (replacement) {
			clonedForeignObject.replaceWith(replacement);
		} else {
			clonedForeignObject.remove();
		}
	}

	// Remove everything opted out of image export (control overlays, grid, ...)
	for (const node of Array.from(
		cloned.querySelectorAll('[data-canvas-export="exclude"]'),
	)) {
		node.remove();
	}

	// Lay the background color as a solid rect covering the whole viewBox
	const background =
		options.background ?? getComputedStyle(svg).backgroundColor;
	const isTransparent =
		!background ||
		background === "transparent" ||
		background === "rgba(0, 0, 0, 0)";
	if (!isTransparent) {
		const viewBox = cloned.viewBox.baseVal;
		const backgroundRect = document.createElementNS(SVG_NS, "rect");
		backgroundRect.setAttribute("x", String(viewBox.x));
		backgroundRect.setAttribute("y", String(viewBox.y));
		backgroundRect.setAttribute("width", String(viewBox.width));
		backgroundRect.setAttribute("height", String(viewBox.height));
		backgroundRect.setAttribute("fill", background);
		cloned.insertBefore(backgroundRect, cloned.firstChild);
	}

	// Declare namespaces explicitly since the file is parsed as a standalone document
	cloned.setAttribute("xmlns", SVG_NS);
	cloned.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

	if (options.source) {
		embedCanvasSource(cloned, options.source);
	}

	return cloned;
};

/** Serializes an SVG element to an XML string (with the XML declaration). */
export const serializeSvg = (svg: SVGSVGElement): string => {
	const xml = new XMLSerializer().serializeToString(svg);
	return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
};
