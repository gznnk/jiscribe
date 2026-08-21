import { Canvas, lightCanvasTheme } from "@jiscribe/canvas";
import type { CanvasConfig, CanvasDoc, CanvasHandle } from "@jiscribe/canvas";
import { annotationPlugin } from "@jiscribe/plugin-annotation-shapes";
import { containerPlugin } from "@jiscribe/plugin-container-shapes";
import { flowchartPlugin } from "@jiscribe/plugin-flowchart-shapes";
import { generalPlugin } from "@jiscribe/plugin-general-shapes";
import { lucideIconPlugin } from "@jiscribe/plugin-lucide-icon-shape";
import { markdownPlugin } from "@jiscribe/plugin-markdown-shape";
import { stickyPlugin } from "@jiscribe/plugin-sticky-shape";
import { umlPlugin } from "@jiscribe/plugin-uml-shapes";
import { createRoot } from "react-dom/client";

import "@jiscribe/canvas/fonts.css";
import "katex/dist/katex.min.css";

import type {
	HarnessRenderRequest,
	HarnessRenderResult,
	JiscribeHarness,
} from "./harnessBridge";
import { HARNESS_GLOBAL } from "./harnessBridge";

// The shipped set, in the order @jiscribe/doc-tools gives the parser. A shape whose
// plugin is missing here is simply not drawn, so this list and the one the CLI
// validates with have to be the same eight.
const plugins = [
	flowchartPlugin,
	containerPlugin,
	markdownPlugin,
	stickyPlugin,
	umlPlugin,
	generalPlugin,
	annotationPlugin,
	lucideIconPlugin,
];

// Module scope, so re-rendering never hands Canvas a new config object.
const initialConfig: CanvasConfig = { plugins };

const EMPTY_DOC: CanvasDoc = { version: 1, root: [] };

const container = document.getElementById("root");
if (!container) {
	throw new Error("harness page has no #root");
}
const root = createRoot(container);

/** Bumped per mount and used as the Canvas key, so each render starts from a fresh canvas. */
let generation = 0;

/**
 * Mounts the document and resolves once the canvas has handed back its handle.
 * The `key` forces a remount rather than an update: a render is a one-shot
 * snapshot, and a fresh canvas cannot carry over a camera or a selection from
 * whatever was drawn before it.
 */
const mountDoc = (doc: CanvasDoc): Promise<CanvasHandle> => {
	generation += 1;
	return new Promise<CanvasHandle>((resolve) => {
		root.render(
			<Canvas
				key={generation}
				doc={doc}
				initialConfig={initialConfig}
				theme={lightCanvasTheme}
				autoFocus={false}
				ref={(handle: CanvasHandle | null) => {
					if (handle) {
						resolve(handle);
					}
				}}
			/>,
		);
	});
};

const nextFrame = (): Promise<void> =>
	new Promise((resolve) => {
		requestAnimationFrame(() => {
			resolve();
		});
	});

/**
 * Waits until the drawing has stopped changing: two frames for React to commit
 * and the browser to lay out, then the font loads the layout kicked off.
 *
 * Fonts are fetched per unicode-range as text needs them, so nothing is pending
 * until something has been drawn — `document.fonts.ready` before the first paint
 * resolves immediately and means nothing. Hence frames first, then fonts, then
 * frames again for the relayout the arriving faces cause.
 */
const settle = async (): Promise<void> => {
	await nextFrame();
	await nextFrame();
	await document.fonts.ready;
	await nextFrame();
	await document.fonts.ready;
	await nextFrame();
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	let binary = "";
	// Chunked, because spreading a multi-megabyte array into String.fromCharCode
	// overflows the argument list.
	const CHUNK = 0x8000;
	for (let offset = 0; offset < bytes.length; offset += CHUNK) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
	}
	return btoa(binary);
};

const render = async (
	request: HarnessRenderRequest,
): Promise<HarnessRenderResult> => {
	// Mounted twice on purpose. A box whose size is derived from its content is
	// measured while the canvas renders, and on the first pass the JP faces have
	// not arrived yet — so the first mount is what makes the browser fetch them,
	// and the second is the one measured with them present.
	await mountDoc(request.doc);
	await settle();
	const handle = await mountDoc(request.doc);
	await settle();

	const exportOptions = {
		region: request.region,
		margin: request.margin,
		includeSource: request.includeSource,
		transparentBackground: request.transparentBackground,
	};

	if (request.format === "svg") {
		const svg = handle.export.toSvgString(exportOptions);
		if (svg === null) {
			throw new Error("canvas produced no SVG");
		}
		return { format: "svg", svg };
	}

	const capture = await handle.export.capturePng({
		...exportOptions,
		scale: request.scale,
	});
	if (capture === null) {
		throw new Error("canvas produced no PNG");
	}
	return {
		format: "png",
		base64: await blobToBase64(capture.blob),
		pixelWidth: capture.pixelWidth,
		pixelHeight: capture.pixelHeight,
		region: capture.region,
	};
};

const harness: JiscribeHarness = { render };
(window as unknown as Record<string, unknown>)[HARNESS_GLOBAL] = harness;

// An empty canvas is mounted up front so the page is ready the moment it loads,
// and so a first render is not also the first time React and emotion run.
void mountDoc(EMPTY_DOC);
