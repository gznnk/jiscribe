// The preview page: the Canvas and the standard shape set, mounted over the
// document the `preview` command wrote into the HTML around this script.
//
// A sibling of harness/main.tsx and deliberately not the same page — the harness
// exists to be photographed once and exposes a render function to the Node side,
// while this one is what a person opens, so it mounts on load and then keeps out
// of the way.

import { Canvas, darkCanvasTheme } from "@jiscribe/canvas";
import type { CanvasConfig } from "@jiscribe/canvas";
import {
	standardPlugins,
	standardToolbarLayout,
} from "@jiscribe/standard-shapes";
import { createRoot } from "react-dom/client";

import "katex/dist/katex.min.css";

import type { PreviewPayload } from "./previewBridge";
import { PREVIEW_FONT_FAMILIES, PREVIEW_GLOBAL } from "./previewBridge";

// Module scope, so a re-render never hands Canvas a new config object. No
// `viewport`: setting one would suppress the document's own `view.open` framing,
// and the document knows better than this page does where it wants to be looked at.
const initialConfig: CanvasConfig = { plugins: standardPlugins };

const payload = (
	window as unknown as Record<string, PreviewPayload | undefined>
)[PREVIEW_GLOBAL];

// The ground under the canvas, taken from the theme it is drawn with rather than
// written into the page, so the two cannot drift. Only ever seen while the fonts
// are being fetched, which is exactly when a white page would be jarring.
document.documentElement.style.background = darkCanvasTheme.tokens.canvasBg;

/**
 * Waits for the shipped faces, in both weights and with text that pulls the JP
 * subsets in.
 *
 * Faces are fetched per unicode-range as text needs them, so a page that has
 * drawn nothing has nothing pending and `document.fonts.ready` resolves at once.
 * Asking for the specimen explicitly is what makes the browser fetch them, and
 * mounting after that is what keeps every content-derived box measured against
 * the face the document names rather than the fallback.
 */
const loadFonts = async (): Promise<void> => {
	// Latin, JP kana and a han character, so the ranges a mixed document draws
	// from are all requested.
	const SPECIMEN = "Ag あ漢";
	await Promise.all(
		PREVIEW_FONT_FAMILIES.flatMap((family) => [
			document.fonts.load(`400 16px "${family}"`, SPECIMEN),
			document.fonts.load(`700 16px "${family}"`, SPECIMEN),
		]),
	);
};

const mount = async (): Promise<void> => {
	const container = document.getElementById("preview-root");
	if (!container) {
		throw new Error("preview page has no #preview-root");
	}
	if (payload === undefined) {
		throw new Error(`preview page carries no window.${PREVIEW_GLOBAL}`);
	}
	// A face that cannot be fetched — an offline machine, a blocked host — is not
	// worth an empty page: the stacks all end in a generic keyword, so the drawing
	// still happens, on the fallback face and with the boxes it measures.
	await loadFonts().catch(() => undefined);
	createRoot(container).render(
		<Canvas
			doc={payload.doc}
			initialConfig={initialConfig}
			toolbar={{ layout: standardToolbarLayout }}
		/>,
	);
};

void mount();
