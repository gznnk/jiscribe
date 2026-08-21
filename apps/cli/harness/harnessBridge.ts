import type { CanvasDoc } from "@jiscribe/doc";

/**
 * What the Node side asks the page to draw. Crosses `page.evaluate`, so every
 * field is JSON — the document included, which is why it is sent rather than
 * read from disk by the page.
 */
export type HarnessRenderRequest = {
	/** The document to mount; already parsed and validated on the Node side. */
	doc: CanvasDoc;
	/** Which of the two images to produce. */
	format: "png" | "svg";
	/** `content` fits the drawing, `viewport` takes the harness's own 1280x800 view. */
	region: "content" | "viewport";
	/** Margin in world px kept around the drawing; ignored by the `viewport` region. */
	margin: number;
	/** Output pixels per logical px. PNG only; an SVG has no raster to scale. */
	scale: number;
	/** Whether to leave the background unpainted, producing an alpha-transparent image. */
	transparentBackground: boolean;
	/** Whether to embed the `.jis.json` in the image, keeping it re-editable. */
	includeSource: boolean;
};

/** The image the page produced, in a shape `page.evaluate` can hand back. */
export type HarnessRenderResult =
	| {
			format: "png";
			/** The encoded PNG, base64 — bytes cannot cross `page.evaluate` as they are. */
			base64: string;
			/** Width of the image in px, after the scale. */
			pixelWidth: number;
			/** Height of the image in px, after the scale. */
			pixelHeight: number;
			/** The world rect the image covers, margin included. */
			region: { x: number; y: number; width: number; height: number };
	  }
	| { format: "svg"; svg: string };

/** The one function the page exposes, reached through `window.jiscribeHarness`. */
export type JiscribeHarness = {
	render(request: HarnessRenderRequest): Promise<HarnessRenderResult>;
};

/** Name the harness is published under on `window`; shared so the two sides cannot drift. */
export const HARNESS_GLOBAL = "jiscribeHarness";
