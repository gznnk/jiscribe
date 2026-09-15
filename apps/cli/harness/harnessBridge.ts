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
	/**
	 * Margin in world px kept around the drawing; ignored by the `viewport`
	 * region. Left out when the document declares a `view.padding` of its own,
	 * which the canvas then frames the image with instead.
	 */
	margin?: number;
	/** Output pixels per logical px. PNG only; an SVG has no raster to scale. */
	scale: number;
	/** Whether to leave the background unpainted, producing an alpha-transparent image. */
	transparentBackground: boolean;
	/** Whether to embed the `.jis` in the image, keeping it re-editable. */
	includeSource: boolean;
};

/**
 * How long the page waits for the document's images before taking the snapshot
 * anyway. A file the Node side cannot serve is refused at once, so only a slow
 * read gets this far, and past it the shape is drawn as a placeholder rather
 * than the render hanging. Both sides read it: the page to wait, the Node side
 * to name the deadline in the warning it prints.
 */
export const IMAGE_SETTLE_DEADLINE_MS = 10_000;

/** The image the page produced, in a shape `page.evaluate` can hand back. */
export type HarnessRenderImage =
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

/** The image, plus what the page could not finish before producing it. */
export type HarnessRenderResult = HarnessRenderImage & {
	/**
	 * How many image shapes were still waiting for their file when
	 * `IMAGE_SETTLE_DEADLINE_MS` ran out; those are drawn as placeholders, so a
	 * non-zero count is a gap in the image that nothing else on the Node side
	 * can see.
	 */
	unsettledImageCount: number;
};

/** The one function the page exposes, reached through `window.jiscribeHarness`. */
export type JiscribeHarness = {
	render(request: HarnessRenderRequest): Promise<HarnessRenderResult>;
};

/** Name the harness is published under on `window`; shared so the two sides cannot drift. */
export const HARNESS_GLOBAL = "jiscribeHarness";

/**
 * Path an image shape's file is fetched from: the Node side answers it out of the
 * input document's directory. Same-origin with the page, which is what keeps the
 * PNG rasterizer's canvas untainted.
 */
export const HARNESS_DOC_IMAGE_PATH = "/doc-image";

/**
 * The URL the page fetches an image `src` from.
 *
 * The `src` travels as a query parameter rather than as path segments: a browser
 * folds `..` (percent-encoded or not) out of a URL's path before the request is
 * made, so an escaping `src` would reach the Node side already rewritten into an
 * innocent one — and be refused as "not an image request" instead of as the
 * escape it is, with no warning for the person rendering.
 *
 * @param src - The raw `src` string from the doc, `/`-separated and relative to the document
 * @returns The root-relative URL, which is same-origin with the harness page
 */
export const toHarnessDocImageUrl = (src: string): string =>
	`${HARNESS_DOC_IMAGE_PATH}?src=${encodeURIComponent(src)}`;
