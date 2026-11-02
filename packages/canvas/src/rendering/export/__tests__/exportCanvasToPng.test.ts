// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { rasterizeSvgToPng } from "../exportCanvasToPng";

const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

const SVG_DATA_URL_PREFIX = "data:image/svg+xml;charset=utf-8,";

/** A live canvas SVG with one text overlay, marked to be kept as HTML or not. */
const mountOverlaySvg = (isMarkedHtml: boolean): SVGSVGElement => {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", "0 0 400 300");
	const foreignObject = document.createElementNS(SVG_NS, "foreignObject");
	foreignObject.setAttribute("width", "200");
	foreignObject.setAttribute("height", "100");
	if (isMarkedHtml) {
		foreignObject.setAttribute("data-canvas-export", "html");
	}
	const wrapper = document.createElementNS(XHTML_NS, "div");
	const content = document.createElementNS(XHTML_NS, "div");
	content.textContent = "body";
	wrapper.append(content);
	foreignObject.append(wrapper);
	svg.append(foreignObject);
	document.body.append(svg);
	return svg;
};

/** An SVG an `<img>` was handed, by the kind of URL it came through. */
type LoadedSvg = { urlKind: "data" | "blob"; svgXml: Promise<string> };

/**
 * Stands in for the browser's image decoding, blob URLs and canvas: every
 * `<img>` loads at once, and the first encode throws the taint error when
 * `isFirstEncodeTainted`.
 *
 * @returns Every SVG an image loaded, oldest first
 */
const stubRasterizer = (isFirstEncodeTainted: boolean): LoadedSvg[] => {
	const blobsByUrl = new Map<string, Blob>();
	const loadedSvgs: LoadedSvg[] = [];
	vi.stubGlobal("URL", {
		...URL,
		createObjectURL: (blob: Blob) => {
			const url = `blob:stub/${blobsByUrl.size}`;
			blobsByUrl.set(url, blob);
			return url;
		},
		revokeObjectURL: () => {},
	});
	class LoadingImage {
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;
		set src(value: string) {
			const blob = blobsByUrl.get(value);
			loadedSvgs.push(
				blob === undefined
					? {
							urlKind: "data",
							svgXml: Promise.resolve(
								decodeURIComponent(value.slice(SVG_DATA_URL_PREFIX.length)),
							),
						}
					: { urlKind: "blob", svgXml: blob.text() },
			);
			queueMicrotask(() => this.onload?.());
		}
	}
	vi.stubGlobal("Image", LoadingImage);
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
		measureText: () => ({ width: 0 }),
		drawImage: () => {},
	} as unknown as CanvasRenderingContext2D);
	let encodeCount = 0;
	vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
		(callback: BlobCallback) => {
			encodeCount++;
			if (isFirstEncodeTainted && encodeCount === 1) {
				throw new DOMException("tainted", "SecurityError");
			}
			callback(new Blob([Uint8Array.of(0)], { type: "image/png" }));
		},
	);
	return loadedSvgs;
};

/** jsdom lays nothing out, so the size comes from an explicit region. */
const REGION_OPTIONS = { viewBox: { x: 0, y: 0, width: 400, height: 300 } };

afterEach(() => {
	document.body.innerHTML = "";
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("rasterizeSvgToPng", () => {
	it("hands an SVG holding kept HTML to the <img> as a data URL", async () => {
		const loadedSvgs = stubRasterizer(false);

		await rasterizeSvgToPng(mountOverlaySvg(true), REGION_OPTIONS);

		expect(loadedSvgs).toHaveLength(1);
		expect(loadedSvgs[0].urlKind).toBe("data");
		expect(await loadedSvgs[0].svgXml).toContain("<foreignObject");
	});

	it("hands an SVG with no kept HTML to the <img> as a blob URL", async () => {
		const loadedSvgs = stubRasterizer(false);

		await rasterizeSvgToPng(mountOverlaySvg(false), REGION_OPTIONS);

		expect(loadedSvgs).toHaveLength(1);
		expect(loadedSvgs[0].urlKind).toBe("blob");
		expect(await loadedSvgs[0].svgXml).not.toContain("<foreignObject");
	});

	it("draws the HTML as <text>, and says so, when the kept HTML taints the canvas", async () => {
		const loadedSvgs = stubRasterizer(true);
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		const { blob } = await rasterizeSvgToPng(
			mountOverlaySvg(true),
			REGION_OPTIONS,
		);

		expect(blob.type).toBe("image/png");
		expect(loadedSvgs).toHaveLength(2);
		const retriedSvg = await loadedSvgs[1].svgXml;
		expect(retriedSvg).not.toContain("<foreignObject");
		expect(retriedSvg).toContain("<text");
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toContain("1 HTML overlay(s)");
	});

	it("does not retry a taint when nothing was kept as HTML", async () => {
		const loadedSvgs = stubRasterizer(true);

		await expect(
			rasterizeSvgToPng(mountOverlaySvg(false), REGION_OPTIONS),
		).rejects.toThrow("tainted");
		expect(loadedSvgs).toHaveLength(1);
	});
});
